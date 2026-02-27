import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const search = searchParams.get('search') || '';

    const where = {};
    if (search) {
        where.OR = [
            { code: { contains: search, mode: 'insensitive' } },
            { supplier: { contains: search, mode: 'insensitive' } },
            { project: { name: { contains: search, mode: 'insensitive' } } },
        ];
    }

    const [orders, total] = await Promise.all([
        prisma.purchaseOrder.findMany({
            where,
            include: {
                items: true,
                project: { select: { name: true, code: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.purchaseOrder.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(orders, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
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
});
