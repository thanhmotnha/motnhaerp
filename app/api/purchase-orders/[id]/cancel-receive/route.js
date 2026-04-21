import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST /api/purchase-orders/[id]/cancel-receive
// Rollback TẤT CẢ các lần nhận "Giao thẳng dự án" của PO này:
// - Reset PurchaseOrderItem.receivedQty về 0 cho items có projectId
// - Trừ MaterialPlan.receivedQty tương ứng
// - Xóa ProjectExpense chưa chi (match description [GRN] ... — mã PO)
// - Không đụng GRN/StockIssue (phải xóa qua flow riêng nếu có)
export const POST = withAuth(async (_request, { params }) => {
    const { id } = await params;

    const po = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: { items: true },
    });
    if (!po) return NextResponse.json({ error: 'Không tìm thấy PO' }, { status: 404 });

    const directItems = po.items.filter(it => it.projectId && (it.receivedQty || 0) > 0);
    if (directItems.length === 0) {
        return NextResponse.json({ error: 'Không có items nào đã nhận giao thẳng dự án để hủy' }, { status: 400 });
    }

    const descriptions = directItems.map(it => `[GRN] ${it.productName} — ${po.code}`);
    const paidExpenses = await prisma.projectExpense.findMany({
        where: {
            description: { in: descriptions },
            status: { in: ['Đã chi', 'Hoàn thành'] },
            deletedAt: null,
        },
        select: { code: true },
    });
    if (paidExpenses.length > 0) {
        return NextResponse.json({
            error: `Có ${paidExpenses.length} chi phí đã chi — hủy thanh toán trước (${paidExpenses.map(e => e.code).join(', ')})`,
        }, { status: 422 });
    }

    await prisma.$transaction(async (tx) => {
        for (const item of directItems) {
            const rqty = item.receivedQty || 0;

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
                    const newReceivedQty = Math.max(0, (plan.receivedQty || 0) - rqty);
                    const newStatus = newReceivedQty >= plan.quantity && plan.quantity > 0
                        ? 'Đã nhận đủ'
                        : newReceivedQty > 0 ? 'Nhận một phần' : 'Chưa nhận';
                    await tx.materialPlan.update({
                        where: { id: item.materialPlanId },
                        data: { receivedQty: newReceivedQty, status: newStatus },
                    });
                }
            }

            await tx.purchaseOrderItem.update({
                where: { id: item.id },
                data: { receivedQty: 0 },
            });
        }

        // Recalculate PO status
        const updatedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
        const anyReceived = updatedItems.some(i => i.receivedQty > 0);
        const allReceived = updatedItems.every(i => i.receivedQty >= i.quantity);
        const newStatus = allReceived ? 'Hoàn thành' : anyReceived ? 'Nhận một phần' : 'Chờ nhận';
        await tx.purchaseOrder.update({
            where: { id },
            data: { status: newStatus, receivedDate: allReceived ? new Date() : null },
        });
    });

    return NextResponse.json({ ok: true, itemsReset: directItems.length });
}, { roles: ['giam_doc', 'ke_toan'] });
