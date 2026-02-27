import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
    const { id } = await params;
    const data = await request.json();
    if (data.status === 'Hoàn thành' && !data.completedAt) data.completedAt = new Date();
    const order = await prisma.workOrder.update({ where: { id }, data });
    return NextResponse.json(order);
}

export async function DELETE(request, { params }) {
    const { id } = await params;
    await prisma.workOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
