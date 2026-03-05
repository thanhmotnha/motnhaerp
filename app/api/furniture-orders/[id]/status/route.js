import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/activityLog';

const STATUS_FLOW = [
    'draft', 'confirmed', 'design_review', 'design_approved',
    'material_confirmed', 'in_production', 'qc_done',
    'installing', 'completed',
];

// PUT advance or set status
export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json();
    const { status, note } = body;

    const order = await prisma.furnitureOrder.findUniqueOrThrow({
        where: { id },
        include: {
            items: true,
            designs: { orderBy: { versionNumber: 'desc' }, take: 1 },
            project: { select: { siteReadyFlag: true } },
        },
    });

    // BR-001: Cannot go to in_production without approved design
    if (status === 'in_production') {
        const approvedDesign = order.designs.find(d => d.status === 'approved');
        if (!approvedDesign) {
            return NextResponse.json({ error: 'BR-001: Chưa có bản vẽ được KH duyệt. Không thể mở lệnh sản xuất.' }, { status: 400 });
        }
    }

    // BR-004: Cannot go to installing if project.siteReadyFlag is false
    if (status === 'installing' && order.projectId) {
        if (!order.project?.siteReadyFlag) {
            return NextResponse.json({ error: 'BR-004: Công trình chưa sẵn sàng lắp đặt (siteReadyFlag = false). PM cần xác nhận công trình đã hoàn thiện.' }, { status: 400 });
        }
    }

    const updated = await prisma.furnitureOrder.update({
        where: { id },
        data: {
            status,
            ...(status === 'completed' ? { deliveredAt: new Date() } : {}),
        },
    });

    logActivity({
        actor: session?.user?.name || '',
        action: 'UPDATE',
        entityType: 'FurnitureOrder',
        entityId: id,
        entityLabel: `${order.code} — chuyển sang ${status}`,
        diff: { from: order.status, to: status, note },
    });

    return NextResponse.json({ status: updated.status });
});
