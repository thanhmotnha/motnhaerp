import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/activityLog';

// GET list batches (optionally filter by furnitureOrderId or workshopId)
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const furnitureOrderId = searchParams.get('furnitureOrderId');
    const workshopId = searchParams.get('workshopId');
    const status = searchParams.get('status');

    const where = {};
    if (furnitureOrderId) where.furnitureOrderId = furnitureOrderId;
    if (workshopId) where.workshopId = workshopId;
    if (status) where.status = status;

    const batches = await prisma.productionBatch.findMany({
        where,
        include: {
            workshop: { select: { id: true, code: true, name: true } },
            furnitureOrder: { select: { id: true, code: true, name: true } },
            batchItems: {
                include: { furnitureOrderItem: { select: { id: true, name: true, unit: true } } },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(batches);
});

// POST create new production batch
export const POST = withAuth(async (request, _, session) => {
    const body = await request.json();
    const { furnitureOrderId, workshopId, plannedStartDate, plannedEndDate, notes, itemAssignments } = body;

    if (!furnitureOrderId) return NextResponse.json({ error: 'Thiếu furnitureOrderId' }, { status: 400 });
    if (!workshopId) return NextResponse.json({ error: 'Chọn xưởng sản xuất' }, { status: 400 });

    // BR-001: Order must have an approved design
    const order = await prisma.furnitureOrder.findUniqueOrThrow({
        where: { id: furnitureOrderId },
        include: { designs: { where: { status: 'approved' } } },
    });
    if (order.designs.length === 0) {
        return NextResponse.json({ error: 'BR-001: Chưa có bản vẽ được duyệt. Không thể tạo lệnh sản xuất.' }, { status: 400 });
    }

    // Generate batch code: SX-YYYYMM-XXXX
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await prisma.productionBatch.count();
    const code = `SX-${ym}-${String(count + 1).padStart(4, '0')}`;

    const batch = await prisma.productionBatch.create({
        data: {
            code,
            furnitureOrderId,
            workshopId,
            status: 'planned',
            plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null,
            plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null,
            notes: notes || '',
            batchItems: itemAssignments?.length ? {
                create: itemAssignments.map(a => ({
                    furnitureOrderItemId: a.itemId,
                    plannedQty: a.plannedQty || 1,
                    completedQty: 0,
                    qcPassedQty: 0,
                    qcFailedQty: 0,
                    status: 'pending',
                })),
            } : undefined,
        },
        include: {
            workshop: true,
            batchItems: { include: { furnitureOrderItem: { select: { id: true, name: true } } } },
        },
    });

    logActivity({
        actor: session?.user?.name || '',
        action: 'CREATE',
        entityType: 'ProductionBatch',
        entityId: batch.id,
        entityLabel: `${batch.code} — ${order.code}`,
    });

    return NextResponse.json(batch, { status: 201 });
}, { roles: ['giam_doc', 'pho_gd', 'quan_ly_du_an'] });
