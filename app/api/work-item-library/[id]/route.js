import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const data = await request.json();
    const item = await prisma.workItemLibrary.update({ where: { id }, data });
    return NextResponse.json(item);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.workItemLibrary.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
