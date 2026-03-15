import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_req, { params }) => {
    const { id } = await params;
    const tpl = await prisma.furnitureTemplate.findUnique({ where: { id } });
    if (!tpl) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json(tpl);
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const tpl = await prisma.furnitureTemplate.update({ where: { id }, data: body });
    return NextResponse.json(tpl);
});

export const DELETE = withAuth(async (_req, { params }) => {
    const { id } = await params;
    await prisma.furnitureTemplate.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
});
