import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { goodsReceiptCreateSchema } from '@/lib/validations/goodsReceipt';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const poId = searchParams.get('poId');
    const warehouseId = searchParams.get('warehouseId');

    const where = {};
    if (poId) where.purchaseOrderId = poId;
    if (warehouseId) where.warehouseId = warehouseId;

    const receipts = await prisma.goodsReceipt.findMany({
        where,
        include: {
            purchaseOrder: { select: { code: true, supplier: true } },
            warehouse: { select: { name: true } },
            items: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
    });
    return NextResponse.json(receipts);
});

export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const data = goodsReceiptCreateSchema.parse(body);

    const po = await prisma.purchaseOrder.findUnique({
        where: { id: data.purchaseOrderId },
        include: { items: true },
    });
    if (!po) return NextResponse.json({ error: 'PO không tồn tại' }, { status: 404 });

    const code = await generateCode('goodsReceipt', 'PNK');

    const receipt = await prisma.$transaction(async (tx) => {
        const grn = await tx.goodsReceipt.create({
            data: {
                code,
                purchaseOrderId: data.purchaseOrderId,
                warehouseId: data.warehouseId,
                receivedDate: data.receivedDate || new Date(),
                receivedBy: data.receivedBy || '',
                notes: data.notes || '',
                createdById: session.user.id,
                items: {
                    create: data.items
                        .filter(it => it.qtyReceived > 0)
                        .map(it => ({
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

                const txCode = await generateCode('inventoryTransaction', 'NK');
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
