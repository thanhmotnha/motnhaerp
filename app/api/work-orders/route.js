import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const orders = await prisma.workOrder.findMany({
            include: { project: { select: { name: true, code: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(orders);
    } catch (e) {
        console.error('WorkOrder GET error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const data = await request.json();
        const count = await prisma.workOrder.count();
        const order = await prisma.workOrder.create({
            data: {
                code: `WO${String(count + 1).padStart(3, '0')}`,
                ...data,
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
            },
        });
        return NextResponse.json(order);
    } catch (e) {
        console.error('WorkOrder POST error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
