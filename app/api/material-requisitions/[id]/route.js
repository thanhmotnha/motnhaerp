import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { status, purchaseOrderId, receivedQty, receivedPhotos, receiveNotes, receivedBy } = body;

    const data = {};
    if (status) data.status = status;
    if (purchaseOrderId !== undefined) data.purchaseOrderId = purchaseOrderId;

    // Receipt confirmation
    if (receivedQty !== undefined) {
        data.receivedQty = receivedQty;
        data.receivedAt = new Date();
        data.receivedBy = receivedBy || '';
        data.receiveNotes = receiveNotes || '';
        if (receivedPhotos) data.receivedPhotos = receivedPhotos;
        if (!status) data.status = 'Đã nhận hàng';
    }

    const req = await prisma.materialRequisition.update({
        where: { id },
        data,
        include: { materialPlan: { select: { id: true, productId: true } }, project: { select: { id: true, name: true } } },
    });

    // Update MaterialPlan receivedQty
    if (receivedQty !== undefined && req.materialPlanId) {
        const allReqs = await prisma.materialRequisition.aggregate({
            where: { materialPlanId: req.materialPlanId },
            _sum: { receivedQty: true },
        });
        await prisma.materialPlan.update({
            where: { id: req.materialPlanId },
            data: { receivedQty: allReqs._sum.receivedQty || 0 },
        });
    }

    return NextResponse.json(req);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.materialRequisition.delete({ where: { id } });
    return NextResponse.json({ ok: true });
});
