import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_req, { params }) => {
    const { selId } = await params;
    const sel = await prisma.materialSelection.findUnique({
        where: { id: selId },
        include: { items: true },
    });
    if (!sel) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json(sel);
});

export const PUT = withAuth(async (request, { params }) => {
    const { selId } = await params;
    const body = await request.json();
    const updateData = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.notes !== undefined) updateData.notes = body.notes;

    if (body.status === 'confirmed') {
        updateData.status = 'confirmed';
        updateData.confirmedAt = new Date();
        updateData.confirmedByName = body.confirmedByName || '';
        updateData.confirmedIp = body.confirmedIp || '';
        updateData.confirmationNote = body.confirmationNote || '';
    } else if (body.status === 'changed') {
        updateData.status = 'changed';
    }

    const sel = await prisma.materialSelection.update({
        where: { id: selId },
        data: updateData,
        include: { items: true },
    });
    return NextResponse.json(sel);
});

export const DELETE = withAuth(async (_req, { params }) => {
    const { selId } = await params;
    await prisma.materialSelection.delete({ where: { id: selId } });
    return NextResponse.json({ success: true });
});
