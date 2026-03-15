import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_req, { params }) => {
    const { id } = await params;
    const items = await prisma.furnitureOrderItem.findMany({
        where: { furnitureOrderId: id },
        include: { product: { select: { id: true, code: true, name: true } } },
        orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json(items);
});

export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const maxSort = await prisma.furnitureOrderItem.aggregate({
        where: { furnitureOrderId: id },
        _max: { sortOrder: true },
    });
    const item = await prisma.furnitureOrderItem.create({
        data: {
            furnitureOrderId: id,
            sortOrder: (maxSort._max.sortOrder || 0) + 1,
            name: body.name,
            description: body.description || '',
            unit: body.unit || 'bộ',
            quantity: body.quantity || 1,
            unitPrice: body.unitPrice || 0,
            amount: (body.quantity || 1) * (body.unitPrice || 0),
            specs: body.specs || null,
            productId: body.productId || null,
            quotationItemId: body.quotationItemId || null,
            notes: body.notes || '',
        },
    });
    // Recalc confirmedAmount
    const agg = await prisma.furnitureOrderItem.aggregate({
        where: { furnitureOrderId: id, status: { not: 'cancelled' } },
        _sum: { amount: true },
    });
    await prisma.furnitureOrder.update({
        where: { id },
        data: { confirmedAmount: agg._sum.amount || 0 },
    });
    return NextResponse.json(item, { status: 201 });
});
