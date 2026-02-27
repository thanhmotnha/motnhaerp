import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const data = await request.json();
        if (data.status === 'Hoàn thành' && !data.completedAt) data.completedAt = new Date();
        const order = await prisma.workOrder.update({ where: { id }, data });
        return NextResponse.json(order);
    } catch (e) {
        console.error('WorkOrder PUT error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        await prisma.workOrder.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('WorkOrder DELETE error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
