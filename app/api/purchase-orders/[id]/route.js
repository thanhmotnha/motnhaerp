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
        // Block editing item list once GRN exists or any item has been received
        // (scope to items only — other fields like notes, deliveryDate remain editable)
        const [receiptCount, receivedCount] = await Promise.all([
            prisma.goodsReceipt.count({ where: { purchaseOrderId: id } }),
            prisma.purchaseOrderItem.count({ where: { purchaseOrderId: id, receivedQty: { gt: 0 } } }),
        ]);
        if (receiptCount > 0 || receivedCount > 0) {
            return NextResponse.json({
                error: 'PO đã có phiếu nhận — không được sửa danh sách sản phẩm. Hủy phiếu nhận trước nếu cần.',
            }, { status: 422 });
        }

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
                    // Only write materialPlanId/projectId when the incoming payload
                    // explicitly includes them, to avoid wiping the MaterialPlan link
                    // when the frontend omits these fields (would break refund flow
                    // at line ~119 that checks item.materialPlanId on PO cancel).
                    await tx.purchaseOrderItem.update({
                        where: { id: it.id },
                        data: {
                            productName: it.productName || '',
                            unit: it.unit || '',
                            quantity: qty,
                            unitPrice: price,
                            amount: qty * price,
                            productId: it.productId || null,
                            ...(Object.prototype.hasOwnProperty.call(it, 'materialPlanId') && { materialPlanId: it.materialPlanId || null }),
                            ...(Object.prototype.hasOwnProperty.call(it, 'projectId') && { projectId: it.projectId || null }),
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
                            materialPlanId: it.materialPlanId || null,
                            projectId: it.projectId || null,
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

export const DELETE = withAuth(async (_request, { params }) => {
    const { id } = await params;

    const po = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: { items: true },
    });
    if (!po) return NextResponse.json({ error: 'Không tìm thấy đơn đặt hàng' }, { status: 404 });

    // Block nếu có GRN thật (hàng đã vào kho)
    const receiptCount = await prisma.goodsReceipt.count({ where: { purchaseOrderId: id } });
    if (receiptCount > 0) {
        return NextResponse.json({
            error: 'PO đã có phiếu nhập kho — xóa các phiếu nhập trước, rồi mới xóa được PO.',
        }, { status: 422 });
    }

    // Với items "Giao thẳng dự án" đã nhận: auto-rollback nếu ProjectExpense chưa chi
    const directReceivedItems = po.items.filter(it => it.projectId && (it.receivedQty || 0) > 0);
    if (directReceivedItems.length > 0) {
        const expenseCodes = directReceivedItems.map(it => `[GRN] ${it.productName} — ${po.code}`);
        const paidExpenses = await prisma.projectExpense.findMany({
            where: {
                description: { in: expenseCodes },
                status: { in: ['Đã chi', 'Hoàn thành'] },
                deletedAt: null,
            },
            select: { code: true, description: true },
        });
        if (paidExpenses.length > 0) {
            return NextResponse.json({
                error: `PO có ${paidExpenses.length} chi phí đã chi — không thể xóa. Hủy thanh toán các lệnh chi trước: ${paidExpenses.map(e => e.code).join(', ')}`,
            }, { status: 422 });
        }
    }

    await prisma.$transaction(async (tx) => {
        // Rollback giao thẳng dự án: xóa ProjectExpense chưa chi + reverse MaterialPlan.receivedQty
        for (const item of directReceivedItems) {
            await tx.projectExpense.deleteMany({
                where: {
                    description: `[GRN] ${item.productName} — ${po.code}`,
                    status: 'Chờ thanh toán',
                    deletedAt: null,
                },
            });
            if (item.materialPlanId) {
                const plan = await tx.materialPlan.findUnique({ where: { id: item.materialPlanId } });
                if (plan) {
                    const newReceivedQty = Math.max(0, (plan.receivedQty || 0) - (item.receivedQty || 0));
                    const newStatus = newReceivedQty >= plan.quantity && plan.quantity > 0
                        ? 'Đã nhận đủ'
                        : newReceivedQty > 0 ? 'Nhận một phần' : 'Chưa nhận';
                    await tx.materialPlan.update({
                        where: { id: item.materialPlanId },
                        data: { receivedQty: newReceivedQty, status: newStatus },
                    });
                }
            }
        }

        // Reverse MaterialPlan.orderedQty
        for (const item of po.items) {
            if (item.materialPlanId && item.quantity > 0) {
                await tx.materialPlan.update({
                    where: { id: item.materialPlanId },
                    data: { orderedQty: { decrement: item.quantity } },
                });
            }
        }

        await tx.materialRequisition.updateMany({
            where: { purchaseOrderId: id },
            data: { purchaseOrderId: null, status: 'Chờ xử lý' },
        });
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
        await tx.purchaseOrder.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
}, { roles: ['giam_doc', 'ke_toan'] });
