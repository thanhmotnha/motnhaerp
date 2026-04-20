import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const type = searchParams.get('type');
    const warehouseId = searchParams.get('warehouseId');
    const productId = searchParams.get('productId');
    const search = searchParams.get('search') || '';

    const where = {};
    if (type) where.type = type;
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;
    if (search) {
        where.OR = [
            { code: { contains: search, mode: 'insensitive' } },
            { product: { name: { contains: search, mode: 'insensitive' } } },
        ];
    }

    const [transactions, total, warehouses] = await Promise.all([
        prisma.inventoryTransaction.findMany({
            where,
            include: {
                product: { select: { name: true, unit: true } },
                warehouse: { select: { name: true } },
                project: { select: { name: true } },
            },
            orderBy: { date: 'desc' },
            skip,
            take: limit,
        }),
        prisma.inventoryTransaction.count({ where }),
        prisma.warehouse.findMany({ orderBy: { name: 'asc' } }),
    ]);

    return NextResponse.json({
        ...paginatedResponse(transactions, total, { page, limit }),
        warehouses,
    });
});

export const POST = withAuth(async (request, _ctx, session) => {
    const data = await request.json();
    if (!data.warehouseId) return NextResponse.json({ error: 'Kho bắt buộc' }, { status: 400 });

    const items = data.items?.length > 0
        ? data.items
        : [{ productId: data.productId, quantity: data.quantity, unit: data.unit }];

    if (!items.length || !items[0].productId) {
        return NextResponse.json({ error: 'Sản phẩm bắt buộc' }, { status: 400 });
    }

    const type = data.type || 'Nhập';
    const isNhap = type === 'Nhập';

    // Load products for names + prices + stock validation
    const productIds = items.map(it => it.productId).filter(Boolean);
    const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, unit: true, importPrice: true, stock: true, warehouseId: true },
    });
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    // Validate tất cả SP cùng kho với phiếu
    for (const item of items) {
        const p = productMap[item.productId];
        if (!p) continue;
        if (p.warehouseId && p.warehouseId !== data.warehouseId) {
            return NextResponse.json({
                error: `${p.name}: thuộc kho khác với phiếu — tách phiếu riêng cho mỗi kho`,
            }, { status: 400 });
        }
    }

    // Validate xuất kho không vượt tồn
    if (!isNhap) {
        for (const item of items) {
            const qty = Number(item.quantity) || 0;
            const p = productMap[item.productId];
            if (!p) return NextResponse.json({ error: 'Sản phẩm không tồn tại' }, { status: 400 });
            if ((p.stock || 0) < qty) {
                return NextResponse.json({ error: `${p.name}: tồn kho không đủ (tồn: ${p.stock}, cần: ${qty})` }, { status: 400 });
            }
        }
    }

    // Pre-generate codes outside transaction
    const parentPrefix = isNhap ? 'PNK' : 'PXK';
    const parentCode = await generateCode(isNhap ? 'goodsReceipt' : 'stockIssue', parentPrefix);

    // Pre-compute NK/XK transaction codes sequentially
    const validItems = items.filter(it => it.productId && Number(it.quantity) > 0);
    const txPrefix = isNhap ? 'NK' : 'XK';
    const maxResult = await prisma.$queryRawUnsafe(
        `SELECT COALESCE(MAX(CAST(REPLACE(code, $1, '') AS INTEGER)), 0) as max_num
         FROM "InventoryTransaction"
         WHERE code LIKE $2 AND REPLACE(code, $1, '') ~ '^[0-9]+$'`,
        txPrefix, `${txPrefix}%`
    );
    const txBaseMax = Number(maxResult?.[0]?.max_num ?? 0);

    const receivedDate = data.date ? new Date(data.date) : new Date();

    const result = await prisma.$transaction(async (tx) => {
        let parent;

        if (isNhap) {
            parent = await tx.goodsReceipt.create({
                data: {
                    code: parentCode,
                    purchaseOrderId: null,
                    warehouseId: data.warehouseId,
                    receivedDate,
                    receivedBy: data.receivedBy || '',
                    notes: data.note || '',
                    createdById: session?.user?.id || '',
                    items: {
                        create: validItems.map(it => {
                            const p = productMap[it.productId];
                            return {
                                productId: it.productId,
                                productName: p?.name || '',
                                unit: it.unit || p?.unit || '',
                                qtyOrdered: Number(it.quantity) || 0,
                                qtyReceived: Number(it.quantity) || 0,
                                unitPrice: Number(it.unitPrice ?? p?.importPrice ?? 0),
                                variantLabel: it.variantLabel || '',
                            };
                        }),
                    },
                },
            });
        } else {
            parent = await tx.stockIssue.create({
                data: {
                    code: parentCode,
                    warehouseId: data.warehouseId,
                    projectId: data.projectId || null,
                    issuedDate: receivedDate,
                    issuedBy: data.issuedBy || '',
                    notes: data.note || '',
                    createdById: session?.user?.id || '',
                    items: {
                        create: validItems.map(it => {
                            const p = productMap[it.productId];
                            return {
                                productId: it.productId,
                                productName: p?.name || '',
                                unit: it.unit || p?.unit || '',
                                qty: Number(it.quantity) || 0,
                                unitPrice: Number(it.unitPrice ?? p?.importPrice ?? 0),
                                variantLabel: it.variantLabel || '',
                            };
                        }),
                    },
                },
            });
        }

        // Create InventoryTransaction + update Product.stock
        for (let i = 0; i < validItems.length; i++) {
            const item = validItems[i];
            const qty = Number(item.quantity) || 0;
            const txCode = `${txPrefix}${String(txBaseMax + 1 + i).padStart(3, '0')}`;
            await tx.inventoryTransaction.create({
                data: {
                    code: txCode,
                    type,
                    quantity: qty,
                    unit: item.unit || productMap[item.productId]?.unit || '',
                    note: `${isNhap ? 'Phiếu nhập' : 'Phiếu xuất'} ${parentCode}${data.note ? ` — ${data.note}` : ''}`,
                    date: receivedDate,
                    productId: item.productId,
                    warehouseId: data.warehouseId,
                    projectId: data.projectId || null,
                },
            });
            const delta = isNhap ? qty : -qty;
            await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: delta } } });
        }

        // Xuất kho cho dự án → tạo ProjectExpense để ghi nhận chi phí vật tư
        if (!isNhap && data.projectId) {
            const totalValue = validItems.reduce((sum, it) => {
                const p = productMap[it.productId];
                const price = Number(it.unitPrice ?? p?.importPrice ?? 0);
                return sum + (Number(it.quantity) || 0) * price;
            }, 0);
            if (totalValue > 0) {
                const cpCode = await generateCode('projectExpense', 'CP');
                await tx.projectExpense.create({
                    data: {
                        code: cpCode,
                        expenseType: 'Xuất kho',
                        description: `[Xuất kho] ${parentCode} — ${validItems.length} vật tư`,
                        amount: totalValue,
                        paidAmount: totalValue,
                        category: 'Vật tư',
                        status: 'Đã chi',
                        projectId: data.projectId,
                        date: receivedDate,
                        notes: `Phiếu xuất kho ${parentCode}`,
                    },
                });
            }
        }

        return parent;
    });

    return NextResponse.json(result, { status: 201 });
});
