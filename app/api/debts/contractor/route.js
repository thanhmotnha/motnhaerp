import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generateCode } from '@/lib/generateCode';
import { contractorDebtCreateSchema } from '@/lib/validations/debt';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const contractorId = searchParams.get('contractorId');
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');

    const where = {};
    if (contractorId) where.contractorId = contractorId;
    if (projectId) where.projectId = projectId;
    if (status && status !== 'all') where.status = status;

    const debts = await prisma.contractorDebt.findMany({
        where,
        include: {
            contractor: { select: { id: true, code: true, name: true } },
            project: { select: { id: true, code: true, name: true } },
            payments: { orderBy: { date: 'asc' } },
        },
        orderBy: { date: 'desc' },
    });

    return NextResponse.json(debts.map(d => ({
        ...d,
        remaining: d.totalAmount - d.paidAmount,
    })));
});

export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const data = contractorDebtCreateSchema.parse(body);
    const code = await generateCode('contractorDebt', 'CNTH');

    const debt = await prisma.contractorDebt.create({
        data: { ...data, code, createdById: session.user.id },
        include: {
            contractor: { select: { id: true, code: true, name: true } },
            project: { select: { id: true, code: true, name: true } },
        },
    });
    return NextResponse.json({ ...debt, remaining: debt.totalAmount - debt.paidAmount }, { status: 201 });
});
