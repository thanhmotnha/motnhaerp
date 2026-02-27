import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { customerCreateSchema } from '@/lib/validations/customer';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [customers, total] = await Promise.all([
        prisma.customer.findMany({
            where,
            include: { projects: { select: { id: true, name: true, status: true } } },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.customer.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(customers, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const data = customerCreateSchema.parse(body);

    const code = await generateCode('customer', 'KH');
    const customer = await prisma.customer.create({
        data: {
            code,
            ...data,
        },
    });

    return NextResponse.json(customer, { status: 201 });
});
