import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
    const { id } = await params;
    const data = await request.json();
    const item = await prisma.workItemLibrary.update({ where: { id }, data });
    return NextResponse.json(item);
}

export async function DELETE(request, { params }) {
    const { id } = await params;
    await prisma.workItemLibrary.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
