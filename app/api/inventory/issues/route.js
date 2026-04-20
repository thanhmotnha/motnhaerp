import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { NextResponse } from 'next/server';
import { stockIssueCreateSchema } from '@/lib/validations/stockIssue';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const warehouseId = searchParams.get('warehouseId');
    const projectId = searchParams.get('projectId');

    const where = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (projectId) where.projectId = projectId;

    const [issues, total] = await Promise.all([
        prisma.stockIssue.findMany({
            where,
            include: {
                warehouse: { select: { name: true } },
                project: { select: { name: true, code: true } },
                items: true,
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.stockIssue.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(issues, total, { page, limit }));
});

export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const data = stockIssueCreateSchema.parse(body);

    const code = await generateCode('stockIssue', 'PXK');

    let issue;
    try {
        issue = await prisma.$transaction(async (tx) => {
            // Validate tồn kho + kho-SP bên trong transaction để tránh race condition
            for (const item of data.items) {
                if (!item.productId) continue;
                const product = await tx.product.findUnique({
                    where: { id: item.productId },
                    select: { stock: true, name: true, warehouseId: true },
                });
                if (!product) throw Object.assign(new Error('Sản phẩm không tồn tại'), { status: 400 });
                if (product.warehouseId && product.warehouseId !== data.warehouseId) {
                    throw Object.assign(
                        new Error(`${product.name}: thuộc kho khác với phiếu xuất — tách phiếu riêng`),
                        { status: 400 }
                    );
                }
                if ((product.stock || 0) < item.qty) {
                    throw Object.assign(
                        new Error(`${item.productName}: tồn kho không đủ (tồn: ${product.stock}, cần: ${item.qty})`),
                        { status: 400 }
                    );
                }
            }

            const si = await tx.stockIssue.create({
                data: {
                    code,
                    warehouseId: data.warehouseId,
                    projectId: data.projectId,
                    issuedDate: data.issuedDate || new Date(),
                    issuedBy: data.issuedBy || '',
                    notes: data.notes || '',
                    createdById: session.user.id,
                    items: {
                        create: data.items.map(it => ({
                            productId: it.productId,
                            productName: it.productName,
                            unit: it.unit,
                            qty: it.qty,
                            unitPrice: it.unitPrice,
                            variantLabel: it.variantLabel || '',
                        })),
                    },
                },
                include: { items: true },
            });

            let totalValue = 0;
            for (const item of si.items) {
                if (item.productId) {
                    let effectivePrice = item.unitPrice;
                    // Dùng importPrice hiện tại nếu unitPrice chưa nhập
                    if (!effectivePrice) {
                        const product = await tx.product.findUnique({
                            where: { id: item.productId },
                            select: { importPrice: true },
                        });
                        effectivePrice = product?.importPrice || 0;
                        if (effectivePrice) {
                            await tx.stockIssueItem.update({
                                where: { id: item.id },
                                data: { unitPrice: effectivePrice },
                            });
                        }
                    }
                    totalValue += Number(item.qty || 0) * Number(effectivePrice || 0);

                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { decrement: item.qty } },
                    });

                    const txCode = await generateCode('inventoryTransaction', 'XK');
                    await tx.inventoryTransaction.create({
                        data: {
                            code: txCode,
                            type: 'Xuất',
                            quantity: item.qty,
                            unit: item.unit,
                            note: `Phiếu xuất ${si.code}`,
                            productId: item.productId,
                            warehouseId: data.warehouseId,
                            projectId: data.projectId || null,
                            date: data.issuedDate || new Date(),
                        },
                    });
                }
            }

            // Xuất kho cho dự án → tạo ProjectExpense để ghi nhận chi phí vật tư
            if (data.projectId && totalValue > 0) {
                const cpCode = await generateCode('projectExpense', 'CP');
                await tx.projectExpense.create({
                    data: {
                        code: cpCode,
                        expenseType: 'Xuất kho',
                        description: `[Xuất kho] ${si.code} — ${si.items.length} vật tư`,
                        amount: totalValue,
                        paidAmount: totalValue,
                        category: 'Vật tư',
                        status: 'Đã chi',
                        projectId: data.projectId,
                        date: data.issuedDate || new Date(),
                        notes: `Phiếu xuất kho ${si.code}`,
                    },
                });
            }

            return si;
        });
    } catch (e) {
        if (e.status === 400) return NextResponse.json({ error: e.message }, { status: 400 });
        throw e;
    }

    return NextResponse.json(issue, { status: 201 });
});
