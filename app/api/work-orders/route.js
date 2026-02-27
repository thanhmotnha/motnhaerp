import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { workOrderCreateSchema } from '@/lib/validations/workOrder';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const where = {};

    const [data, total] = await Promise.all([
        prisma.workOrder.findMany({
            where,
            include: { project: { select: { name: true, code: true } } },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        }),
        prisma.workOrder.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(data, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const data = workOrderCreateSchema.parse(body);
    const count = await prisma.workOrder.count();
    const order = await prisma.workOrder.create({
        data: {
            code: `WO${String(count + 1).padStart(3, '0')}`,
            ...data,
        },
    });
    return NextResponse.json(order, { status: 201 });
});
