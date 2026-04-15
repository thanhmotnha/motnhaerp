import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const po = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: { items: true, project: { select: { name: true, code: true, address: true } } },
    });
    if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(po);
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { status, paidAmount, deliveryType, deliveryAddress, notes, deliveryDate, orderDate, supplier, projectId, items } = body;

    // If items provided, update items preserving receivedQty for existing ones
    if (items !== undefined) {
        const po = await prisma.$transaction(async (tx) => {
            // Get existing items to preserve receivedQty
            const existingItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
            const existingMap = Object.fromEntries(existingItems.map(i => [i.id, i]));

            const incomingIds = new Set(items.filter(it => it.id).map(it => it.id));

            // Delete items that are removed and have no receipts
            for (const existing of existingItems) {
                if (!incomingIds.has(existing.id)) {
                    if ((existing.receivedQty || 0) === 0) {
                        await tx.purchaseOrderItem.delete({ where: { id: existing.id } });
                    }
                    // If receivedQty > 0, keep the item (don't lose receipt history)
                }
            }

            // Update or create items
            for (const it of items) {
                const qty = Number(it.quantity) || 0;
                const price = Number(it.unitPrice) || 0;
                if (it.id && existingMap[it.id]) {
                    // Update existing item, preserve receivedQty
                    await tx.purchaseOrderItem.update({
                        where: { id: it.id },
                        data: {
                            productName: it.productName || '',
                            unit: it.unit || '',
                            quantity: qty,
                            unitPrice: price,
                            amount: qty * price,
                            productId: it.productId || null,
                            variantLabel: it.variantLabel || '',
                        },
                    });
                } else {
                    // Create new item
                    await tx.purchaseOrderItem.create({
                        data: {
                            purchaseOrderId: id,
                            productName: it.productName || '',
                            unit: it.unit || '',
                            quantity: qty,
                            unitPrice: price,
                            amount: qty * price,
                            productId: it.productId || null,
                            variantLabel: it.variantLabel || '',
                        },
                    });
                }
            }

            // Recalculate totalAmount from all current items
            const allItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
            const totalAmount = allItems.reduce((s, it) => s + (it.amount || 0), 0);

            return tx.purchaseOrder.update({
                where: { id },
                data: {
                    totalAmount,
                    ...(supplier !== undefined && { supplier }),
                    ...(notes !== undefined && { notes }),
                    ...(projectId !== undefined && { projectId: projectId || null }),
                    ...(deliveryType !== undefined && { deliveryType }),
                    ...(orderDate !== undefined && { orderDate: orderDate ? new Date(orderDate) : undefined }),
                    ...(deliveryDate !== undefined && { deliveryDate: deliveryDate ? new Date(deliveryDate) : null }),
                },
                include: { items: true },
            });
        });
        return NextResponse.json(po);
    }

    // Khi hủy PO: trả lại orderedQty cho MaterialPlan (phần chưa nhận)
    if (status === 'Hủy') {
        const currentPO = await prisma.purchaseOrder.findUnique({
            where: { id },
            include: { items: true },
        });
        if (currentPO && currentPO.status !== 'Hủy') {
            for (const item of currentPO.items) {
                if (!item.materialPlanId) continue;
                const undelivered = Math.max(0, item.quantity - (item.receivedQty || 0));
                if (undelivered > 0) {
                    await prisma.materialPlan.update({
                        where: { id: item.materialPlanId },
                        data: { orderedQty: { decrement: undelivered } },
                    });
                }
            }
        }
    }

    const po = await prisma.purchaseOrder.update({
        where: { id },
        data: {
            ...(status !== undefined && { status }),
            ...(paidAmount !== undefined && { paidAmount: Number(paidAmount) }),
            ...(supplier !== undefined && { supplier }),
            ...(projectId !== undefined && { projectId: projectId || null }),
            ...(deliveryType !== undefined && { deliveryType }),
            ...(deliveryAddress !== undefined && { deliveryAddress }),
            ...(notes !== undefined && { notes }),
            ...(orderDate !== undefined && { orderDate: orderDate ? new Date(orderDate) : undefined }),
            ...(deliveryDate !== undefined && { deliveryDate: deliveryDate ? new Date(deliveryDate) : null }),
        },
        include: { items: true },
    });
    return NextResponse.json(po);
}, { roles: ['giam_doc', 'ke_toan', 'kho', 'ky_thuat'] });
