import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_req, { params }) => {
    const { id } = await params;
    const batch = await prisma.productionBatch.findUnique({
        where: { id },
        include: {
            workshop: true,
            furnitureOrder: { select: { id: true, code: true, name: true, customer: { select: { name: true } } } },
            batchItems: {
                include: { furnitureOrderItem: { select: { id: true, name: true, quantity: true } } },
            },
        },
    });
    if (!batch) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json(batch);
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const updateData = {};

    if (body.status !== undefined) {
        updateData.status = body.status;
        if (body.status === 'in_progress' && !body.actualStart) updateData.actualStart = new Date();
        if (body.status === 'completed' && !body.actualEnd) updateData.actualEnd = new Date();
    }
    if (body.note !== undefined) updateData.note = body.note;
    if (body.qualityNote !== undefined) updateData.qualityNote = body.qualityNote;
    if (body.qualityStatus !== undefined) updateData.qualityStatus = body.qualityStatus;
    if (body.qualityCheckedBy !== undefined) updateData.qualityCheckedBy = body.qualityCheckedBy;
    if (body.qualityCheckedAt !== undefined) updateData.qualityCheckedAt = new Date(body.qualityCheckedAt);
    if (body.expectedStart) updateData.expectedStart = new Date(body.expectedStart);
    if (body.expectedEnd) updateData.expectedEnd = new Date(body.expectedEnd);
    if (body.actualStart) updateData.actualStart = new Date(body.actualStart);
    if (body.actualEnd) updateData.actualEnd = new Date(body.actualEnd);

    const batch = await prisma.productionBatch.update({
        where: { id },
        data: updateData,
        include: { batchItems: true },
    });
    return NextResponse.json(batch);
});
