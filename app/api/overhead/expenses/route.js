import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { generateCode } from '@/lib/generateCode';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { overheadExpenseCreateSchema } from '@/lib/validations/overhead';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const month = searchParams.get('month'); // "2026-03"
    const status = searchParams.get('status');
    const categoryId = searchParams.get('categoryId');

    const where = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (month) {
        const [y, m] = month.split('-').map(Number);
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0, 23, 59, 59, 999);
        where.date = { gte: start, lte: end };
    }

    const [data, total] = await Promise.all([
        prisma.overheadExpense.findMany({
            where,
            include: { category: { select: { id: true, name: true } } },
            skip,
            take: limit,
            orderBy: { date: 'desc' },
        }),
        prisma.overheadExpense.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(data, total, { page, limit }));
});

export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const data = overheadExpenseCreateSchema.parse(body);
    const code = await generateCode('overheadExpense', 'CPG');
    const expense = await prisma.overheadExpense.create({
        data: { code, ...data, createdById: session.user.id },
        include: { category: { select: { id: true, name: true } } },
    });
    return NextResponse.json(expense, { status: 201 });
});
