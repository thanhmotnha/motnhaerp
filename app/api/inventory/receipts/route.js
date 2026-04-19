import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { NextResponse } from 'next/server';
import { goodsReceiptCreateSchema } from '@/lib/validations/goodsReceipt';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const poId = searchParams.get('poId');
    const warehouseId = searchParams.get('warehouseId');

    const where = {};
    if (poId) where.purchaseOrderId = poId;
    if (warehouseId) where.warehouseId = warehouseId;

    const [receipts, total] = await Promise.all([
        prisma.goodsReceipt.findMany({
            where,
            include: {
                purchaseOrder: { select: { code: true, supplier: true } },
                warehouse: { select: { name: true } },
                items: true,
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.goodsReceipt.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(receipts, total, { page, limit }));
});

export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const data = goodsReceiptCreateSchema.parse(body);

    const po = await prisma.purchaseOrder.findUnique({
        where: { id: data.purchaseOrderId },
        include: { items: true },
    });
    if (!po) return NextResponse.json({ error: 'PO không tồn tại' }, { status: 404 });

    // Generate tất cả code TRƯỚC transaction để tránh trùng mã
    // (generateCode dùng prisma global, không thấy uncommitted inserts bên trong tx)
    const grnCode = await generateCode('goodsReceipt', 'PNK');
    const validItems = data.items.filter(it => it.qtyReceived > 0);
    const productItems = validItems.filter(it => it.productId);

    // Lấy MAX một lần, gán offset tuần tự cho từng item
    let txBaseMax = 0;
    if (productItems.length > 0) {
        const maxResult = await prisma.$queryRawUnsafe(
            `SELECT COALESCE(MAX(CAST(REPLACE(code, $1, '') AS INTEGER)), 0) as max_num
             FROM "InventoryTransaction"
             WHERE code LIKE $2 AND REPLACE(code, $1, '') ~ '^[0-9]+$'`,
            'NK', 'NK%'
        );
        txBaseMax = Number(maxResult?.[0]?.max_num ?? 0);
    }
    let txCodeIndex = 0;

    const receipt = await prisma.$transaction(async (tx) => {
        const grn = await tx.goodsReceipt.create({
            data: {
                code: grnCode,
                purchaseOrderId: data.purchaseOrderId,
                warehouseId: data.warehouseId,
                receivedDate: data.receivedDate || new Date(),
                receivedBy: data.receivedBy || '',
                notes: data.notes || '',
                createdById: session.user.id,
                items: {
                    create: validItems.map(it => ({
                        productId: it.productId,
                        productName: it.productName,
                        unit: it.unit,
                        qtyOrdered: it.qtyOrdered,
                        qtyReceived: it.qtyReceived,
                        unitPrice: it.unitPrice,
                        variantLabel: it.variantLabel || '',
                        purchaseOrderItemId: it.purchaseOrderItemId,
                    })),
                },
            },
            include: { items: true },
        });

        for (const item of grn.items) {
            if (item.productId) {
                // Tính giá bình quân gia quyền
                const product = await tx.product.findUnique({
                    where: { id: item.productId },
                    select: { stock: true, importPrice: true },
                });
                const oldStock = product?.stock ?? 0;
                const oldPrice = product?.importPrice ?? 0;
                const newQty = item.qtyReceived;
                const newPrice = item.unitPrice ?? 0;
                const avgPrice = (oldStock + newQty) > 0
                    ? (oldStock * oldPrice + newQty * newPrice) / (oldStock + newQty)
                    : newPrice;

                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: { increment: item.qtyReceived },
                        importPrice: Math.round(avgPrice),
                    },
                });

                // Dùng code đã pre-generate (tránh trùng mã trong cùng transaction)
                const txCode = `NK${String(txBaseMax + 1 + txCodeIndex).padStart(3, '0')}`;
                txCodeIndex++;
                await tx.inventoryTransaction.create({
                    data: {
                        code: txCode,
                        type: 'Nhập',
                        quantity: item.qtyReceived,
                        unit: item.unit,
                        note: `Phiếu nhập ${grn.code} — PO ${po.code}`,
                        productId: item.productId,
                        warehouseId: data.warehouseId,
                        projectId: po.projectId || null,
                        date: data.receivedDate || new Date(),
                    },
                });
            }

            if (item.purchaseOrderItemId) {
                await tx.purchaseOrderItem.update({
                    where: { id: item.purchaseOrderItemId },
                    data: { receivedQty: { increment: item.qtyReceived } },
                });
            }
        }

        const updatedItems = await tx.purchaseOrderItem.findMany({
            where: { purchaseOrderId: data.purchaseOrderId },
        });
        const allReceived = updatedItems.every(i => i.receivedQty >= i.quantity);
        const anyReceived = updatedItems.some(i => i.receivedQty > 0);
        const newStatus = allReceived ? 'Hoàn thành' : anyReceived ? 'Nhận một phần' : po.status;
        await tx.purchaseOrder.update({
            where: { id: data.purchaseOrderId },
            data: {
                status: newStatus,
                receivedDate: allReceived ? new Date() : undefined,
            },
        });

        return grn;
    });

    return NextResponse.json(receipt, { status: 201 });
});
