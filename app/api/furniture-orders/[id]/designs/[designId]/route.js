import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (request, { params }) => {
    const { designId } = await params;
    const body = await request.json();
    const updateData = {};

    // Chỉ cho cập nhật một số trường tùy trạng thái
    if (body.versionLabel !== undefined) updateData.versionLabel = body.versionLabel;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.fileUrl !== undefined) updateData.fileUrl = body.fileUrl;
    if (body.renderImageUrl !== undefined) updateData.renderImageUrl = body.renderImageUrl;
    if (body.technicalSpec !== undefined) updateData.technicalSpec = body.technicalSpec;

    // Workflow: submit → approve / reject
    if (body.status === 'submitted') {
        updateData.status = 'submitted';
        updateData.submittedAt = new Date();
        updateData.submittedBy = body.submittedBy || request.user?.name || '';
    } else if (body.status === 'approved') {
        updateData.status = 'approved';
        updateData.approvedAt = new Date();
        updateData.approvedByName = body.approvedByName || '';
        updateData.approvedIp = body.approvedIp || '';
    } else if (body.status === 'rejected') {
        updateData.status = 'rejected';
        updateData.rejectionReason = body.rejectionReason || '';
    }

    if (body.customerFeedback !== undefined) updateData.customerFeedback = body.customerFeedback;

    const design = await prisma.designVersion.update({ where: { id: designId }, data: updateData });
    return NextResponse.json(design);
});

export const DELETE = withAuth(async (_req, { params }) => {
    const { designId } = await params;
    await prisma.designVersion.delete({ where: { id: designId } });
    return NextResponse.json({ success: true });
});
