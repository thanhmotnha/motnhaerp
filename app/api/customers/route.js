import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { withCodeRetry } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { customerCreateSchema } from '@/lib/validations/customer';

export const GET = withAuth(async (request, _ctx, session) => {
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

    // Role-based ownership filter: kinh_doanh chỉ thấy khách của mình + pool chưa chủ
    if (session.user.role === 'kinh_doanh') {
        const ownerFilter = [
            { salesPersonId: session.user.id },
            { salesPersonId: null },
        ];
        if (where.OR) {
            where.AND = [{ OR: where.OR }, { OR: ownerFilter }];
            delete where.OR;
        } else {
            where.OR = ownerFilter;
        }
    }

    const [customers, total] = await Promise.all([
        prisma.customer.findMany({
            where,
            include: {
                projects: { select: { id: true, name: true, status: true } },
                salesPerson: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.customer.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(customers, total, { page, limit }));
});

export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const data = customerCreateSchema.parse(body);

    // Role check
    if (session.user.role === 'ky_thuat' || session.user.role === 'kho') {
        return NextResponse.json({ error: 'Không có quyền tạo khách hàng' }, { status: 403 });
    }
    // NVKD tự tạo khách → auto-assign chính mình
    if (session.user.role === 'kinh_doanh') {
        data.salesPersonId = session.user.id;
    }

    const customer = await withCodeRetry('customer', 'KH', (code) =>
        prisma.customer.create({
            data: { code, ...data },
            include: { salesPerson: { select: { id: true, name: true, email: true } } },
        })
    );

    return NextResponse.json(customer, { status: 201 });
}, { entityType: 'Customer' });
