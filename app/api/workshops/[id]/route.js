import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_req, { params }) => {
    const { id } = await params;
    const ws = await prisma.workshop.findUnique({
        where: { id },
        include: { batches: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!ws) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json(ws);
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const ws = await prisma.workshop.update({ where: { id }, data: body });
    return NextResponse.json(ws);
});

export const DELETE = withAuth(async (_req, { params }) => {
    const { id } = await params;
    await prisma.workshop.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
});
