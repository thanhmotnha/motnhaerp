import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    const orders = await prisma.purchaseOrder.findMany({
        include: {
            items: true,
            project: { select: { name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(orders);
}

export async function POST(request) {
    const data = await request.json();
    const { items, ...poData } = data;
    const count = await prisma.purchaseOrder.count();
    const order = await prisma.purchaseOrder.create({
        data: {
            code: `PO${String(count + 1).padStart(3, '0')}`,
            ...poData,
            orderDate: poData.orderDate ? new Date(poData.orderDate) : new Date(),
            deliveryDate: poData.deliveryDate ? new Date(poData.deliveryDate) : null,
            items: items ? { create: items } : undefined,
        },
        include: { items: true },
    });
    return NextResponse.json(order);
}
