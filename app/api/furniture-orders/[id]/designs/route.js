import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/activityLog';

// POST upload new design version
export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json();
    const { fileUrl, versionLabel, description, renderImageUrl, technicalSpec } = body;

    if (!fileUrl) return NextResponse.json({ error: 'Thiếu file bản vẽ' }, { status: 400 });

    // Get next version number
    const lastDesign = await prisma.designVersion.findFirst({
        where: { furnitureOrderId: id },
        orderBy: { versionNumber: 'desc' },
    });
    const versionNumber = (lastDesign?.versionNumber || 0) + 1;

    // Supersede previous submitted/draft versions
    if (lastDesign && ['draft', 'submitted'].includes(lastDesign.status)) {
        await prisma.designVersion.update({
            where: { id: lastDesign.id },
            data: { status: 'superseded' },
        });
    }

    const design = await prisma.designVersion.create({
        data: {
            furnitureOrderId: id,
            versionNumber,
            versionLabel: versionLabel || `Bản vẽ v${versionNumber}`,
            description: description || '',
            fileUrl,
            renderImageUrl: renderImageUrl || '',
            technicalSpec: technicalSpec || '',
            submittedBy: session?.user?.name || '',
        },
    });

    // Update order status to design_review
    await prisma.furnitureOrder.update({ where: { id }, data: { status: 'design_review' } });

    logActivity({ actor: session?.user?.name || '', action: 'CREATE', entityType: 'DesignVersion', entityId: design.id, entityLabel: `${design.versionLabel} (Đơn ${id})` });
    return NextResponse.json(design, { status: 201 });
});

// PUT approve/reject design — used by internal staff after KH responds
export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const designId = searchParams.get('designId');
    const body = await request.json();
    const { action, customerFeedback, rejectionReason, approvedByName } = body;

    if (!designId) return NextResponse.json({ error: 'Thiếu designId' }, { status: 400 });
    if (!['approve', 'reject'].includes(action)) {
        return NextResponse.json({ error: 'action phải là approve hoặc reject' }, { status: 400 });
    }

    const design = await prisma.designVersion.findUniqueOrThrow({ where: { id: designId } });

    const updateData = action === 'approve'
        ? { status: 'approved', approvedAt: new Date(), approvedByName: approvedByName || '', customerFeedback: customerFeedback || '' }
        : { status: 'rejected', rejectionReason: rejectionReason || '', customerFeedback: customerFeedback || '' };

    const [updated] = await prisma.$transaction([
        prisma.designVersion.update({ where: { id: designId }, data: updateData }),
        ...(action === 'approve' ? [
            prisma.furnitureOrder.update({ where: { id }, data: { status: 'design_approved' } }),
        ] : []),
    ]);

    logActivity({ actor: session?.user?.name || '', action: action === 'approve' ? 'APPROVE' : 'REJECT', entityType: 'DesignVersion', entityId: designId, entityLabel: design.versionLabel });
    return NextResponse.json(updated);
});
