import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { generateCode } from '@/lib/generateCode';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { overheadBatchCreateSchema } from '@/lib/validations/overhead';
import { logActivity } from '@/lib/activityLogger';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const [data, total] = await Promise.all([
        prisma.overheadBatch.findMany({
            where: { deletedAt: null },
            include: {
                _count: { select: { items: true, allocations: true } },
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        }),
        prisma.overheadBatch.count({ where: { deletedAt: null } }),
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
        // Find how many batches already exist with this period prefix
        const existing = await prisma.overheadBatch.count({
            where: { code: { startsWith: `CPGB-${period}` } },
        });
        code = existing === 0 ? `CPGB-${period}` : `CPGB-${period}-${existing + 1}`;
    } else {
        // Use generateCode for sequential manual batches
        code = await generateCode('overheadBatch', 'CPGB');
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
    await logActivity({
        action: 'CREATE',
        entityType: 'OverheadBatch',
        entityId: batch.id,
        entityLabel: batch.name,
        actor: session.user.name || session.user.email || '',
        actorId: session.user.id,
    });
    return NextResponse.json(batch, { status: 201 });
});
