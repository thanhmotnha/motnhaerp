import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/activityLogger';

/**
 * Batch status update: update multiple records of the same entity type.
 * POST /api/batch/status
 * Body: { entityType: 'Project', ids: ['id1', 'id2'], status: 'Thi công' }
 */
export const POST = withAuth(async (request, _, session) => {
    const { entityType, ids, status } = await request.json();

    if (!entityType || !ids?.length || !status) {
        return NextResponse.json({ error: 'Thiếu entityType, ids hoặc status' }, { status: 400 });
    }

    if (ids.length > 100) {
        return NextResponse.json({ error: 'Tối đa 100 bản ghi mỗi lần' }, { status: 400 });
    }

    const modelMap = {
        Project: 'project',
        Customer: 'customer',
        Contract: 'contract',
        WorkOrder: 'workOrder',
        Quotation: 'quotation',
        Employee: 'employee',
    };

    const model = modelMap[entityType];
    if (!model) {
        return NextResponse.json({ error: `Entity type "${entityType}" không hỗ trợ` }, { status: 400 });
    }

    // Batch update
    const result = await prisma[model].updateMany({
        where: { id: { in: ids } },
        data: { status },
    });

    // Log the batch action
    await logActivity({
        action: 'batch_update',
        entityType,
        entityId: ids.join(','),
        entityLabel: `Cập nhật ${result.count} ${entityType} → ${status}`,
        actor: session?.user?.name || 'Unknown',
        actorId: session?.user?.id || '',
        metadata: { ids, newStatus: status, count: result.count },
    });

    return NextResponse.json({
        success: true,
        updated: result.count,
        status,
    });
}, { roles: ['giam_doc', 'pho_gd'] });
