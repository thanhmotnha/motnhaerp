import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { withCodeRetry } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { customerCreateSchema } from '@/lib/validations/customer';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where = { deletedAt: null };
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
        ];
    }

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

    const customer = await withCodeRetry('customer', 'KH', (code) =>
        prisma.customer.create({ data: { code, ...data } })
    );

    return NextResponse.json(customer, { status: 201 });
}, { entityType: 'Customer' });
