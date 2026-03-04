import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { status, approvedBy = '' } = await request.json();

    if (!['approved', 'rejected'].includes(status)) {
        return NextResponse.json({ error: 'status phải là approved hoặc rejected' }, { status: 400 });
    }

    const order = await prisma.budgetChangeOrder.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (order.status !== 'pending') return NextResponse.json({ error: 'Phiếu đã được xử lý' }, { status: 400 });

    // If approved and has materialPlanId, update the MaterialPlan
    if (status === 'approved' && order.materialPlanId) {
        const updateData = {};
        if (order.newQty > 0) updateData.quantity = order.newQty;
        if (order.newPrice > 0) {
            updateData.unitPrice = order.newPrice;
            updateData.budgetUnitPrice = order.newPrice;
        }
        if (Object.keys(updateData).length > 0) {
            updateData.totalAmount = (order.newQty || order.oldQty) * (order.newPrice || order.oldPrice);
            await prisma.materialPlan.update({ where: { id: order.materialPlanId }, data: updateData });
        }

        // Recalc project budgetTotal
        const plans = await prisma.materialPlan.findMany({ where: { projectId: order.projectId } });
        const budgetTotal = plans.reduce((sum, p) => sum + p.quantity * (p.budgetUnitPrice || p.unitPrice), 0);
        await prisma.project.update({ where: { id: order.projectId }, data: { budgetTotal } });
    }

    const updated = await prisma.budgetChangeOrder.update({
        where: { id },
        data: { status, approvedBy },
    });
    return NextResponse.json(updated);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.budgetChangeOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
