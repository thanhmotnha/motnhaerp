import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { overheadBatchCreateSchema } from '@/lib/validations/overhead';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const [data, total] = await Promise.all([
        prisma.overheadBatch.findMany({
            include: {
                _count: { select: { items: true, allocations: true } },
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        }),
        prisma.overheadBatch.count(),
    ]);
    return NextResponse.json(paginatedResponse(data, total, { page, limit }));
});

export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const { expenseIds, ...batchData } = overheadBatchCreateSchema.parse(body);

    // Auto-generate batch code
    const period = batchData.period || '';
    let code;
    if (period) {
        code = `CPGB-${period}`;
        const exists = await prisma.overheadBatch.findFirst({ where: { code } });
        if (exists) code = `CPGB-${period}-2`;
    } else {
        const count = await prisma.overheadBatch.count();
        code = `CPGB-${String(count + 1).padStart(3, '0')}`;
    }

    // Fetch selected approved expenses to calculate totalAmount
    const expenses = await prisma.overheadExpense.findMany({
        where: { id: { in: expenseIds }, status: 'approved' },
        select: { id: true, amount: true },
    });
    const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);

    const batch = await prisma.$transaction(async (tx) => {
        const b = await tx.overheadBatch.create({
            data: {
                code,
                ...batchData,
                totalAmount,
                createdById: session.user.id,
            },
        });
        await tx.overheadBatchItem.createMany({
            data: expenses.map(e => ({
                batchId: b.id,
                expenseId: e.id,
                amount: e.amount,
            })),
        });
        return tx.overheadBatch.findFirst({
            where: { id: b.id },
            include: { items: { include: { expense: true } }, _count: { select: { allocations: true } } },
        });
    });
    return NextResponse.json(batch, { status: 201 });
});
