import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/activityLog';

const INCLUDE_DETAIL = {
    workshop: true,
    furnitureOrder: { select: { id: true, code: true, name: true, status: true } },
    batchItems: {
        include: { furnitureOrderItem: { select: { id: true, name: true, unit: true, quantity: true } } },
        orderBy: { createdAt: 'asc' },
    },
};

// GET batch detail
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const batch = await prisma.productionBatch.findUniqueOrThrow({ where: { id }, include: INCLUDE_DETAIL });
    return NextResponse.json(batch);
});

// PUT update batch (status, dates, items QC)
export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json();
    const { status, supervisorName, actualStartDate, actualEndDate, notes, batchItemUpdates } = body;

    const batch = await prisma.productionBatch.findUniqueOrThrow({ where: { id } });

    const data = {};
    if (status !== undefined) data.status = status;
    if (supervisorName !== undefined) data.supervisorName = supervisorName;
    if (actualStartDate !== undefined) data.actualStartDate = actualStartDate ? new Date(actualStartDate) : null;
    if (actualEndDate !== undefined) data.actualEndDate = actualEndDate ? new Date(actualEndDate) : null;
    if (notes !== undefined) data.notes = notes;

    // Auto-set actualStartDate when transitioning to in_progress
    if (status === 'in_progress' && !batch.actualStartDate) {
        data.actualStartDate = new Date();
    }
    // Auto-set actualEndDate when completed
    if (status === 'completed' && !batch.actualEndDate) {
        data.actualEndDate = new Date();
    }

    const ops = [prisma.productionBatch.update({ where: { id }, data })];

    // Update individual batch items (QC data)
    if (batchItemUpdates?.length) {
        for (const upd of batchItemUpdates) {
            ops.push(prisma.productionBatchItem.update({
                where: { id: upd.id },
                data: {
                    ...(upd.completedQty !== undefined ? { completedQty: upd.completedQty } : {}),
                    ...(upd.qcPassedQty !== undefined ? { qcPassedQty: upd.qcPassedQty } : {}),
                    ...(upd.qcFailedQty !== undefined ? { qcFailedQty: upd.qcFailedQty } : {}),
                    ...(upd.qcNote !== undefined ? { qcNote: upd.qcNote } : {}),
                    ...(upd.status !== undefined ? { status: upd.status } : {}),
                    ...(upd.qcPassedQty !== undefined ? { qcAt: new Date(), qcBy: session?.user?.name || '' } : {}),
                },
            }));
        }
    }

    await prisma.$transaction(ops);

    const updated = await prisma.productionBatch.findUniqueOrThrow({ where: { id }, include: INCLUDE_DETAIL });

    logActivity({
        actor: session?.user?.name || '',
        action: 'UPDATE',
        entityType: 'ProductionBatch',
        entityId: id,
        entityLabel: `${batch.code} → ${status || batch.status}`,
    });

    return NextResponse.json(updated);
}, { roles: ['giam_doc', 'pho_gd', 'quan_ly_du_an', 'nhan_vien'] });
