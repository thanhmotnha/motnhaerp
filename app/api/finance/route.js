import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const where = {};
    if (type) where.type = type;

    const transactions = await prisma.transaction.findMany({
        where,
        include: { project: { select: { name: true } } },
        orderBy: { date: 'desc' },
    });

    // Contract payments summary (receivables)
    const receivables = await prisma.contractPayment.aggregate({
        _sum: { amount: true, paidAmount: true },
    });

    // Contractor payments summary (payables)
    const payables = await prisma.contractorPayment.aggregate({
        _sum: { contractAmount: true, paidAmount: true },
    });

    // Manual transactions summary
    const income = await prisma.transaction.aggregate({ where: { type: 'Thu' }, _sum: { amount: true } });
    const expense = await prisma.transaction.aggregate({ where: { type: 'Chi' }, _sum: { amount: true } });

    // Project expenses summary (chi phi du an + cong ty)
    const allExpenses = await prisma.projectExpense.findMany({
        select: { amount: true, paidAmount: true, status: true, expenseType: true },
    });
    const totalExpenseApproved = allExpenses.filter(e => e.status !== 'Từ chối').reduce((s, e) => s + (e.amount || 0), 0);
    const totalExpensePaid = allExpenses.filter(e => e.status === 'Đã chi' || e.status === 'Hoàn thành').reduce((s, e) => s + (e.paidAmount || e.amount || 0), 0);
    const totalExpensePending = allExpenses.filter(e => e.status === 'Chờ duyệt').reduce((s, e) => s + (e.amount || 0), 0);

    return NextResponse.json({
        transactions,
        summary: {
            // Receivables (from contract payments)
            totalReceivable: receivables._sum.amount || 0,
            totalReceived: receivables._sum.paidAmount || 0,
            receivableOutstanding: (receivables._sum.amount || 0) - (receivables._sum.paidAmount || 0),
            // Payables (to contractors)
            totalPayable: payables._sum.contractAmount || 0,
            totalPaid: payables._sum.paidAmount || 0,
            payableOutstanding: (payables._sum.contractAmount || 0) - (payables._sum.paidAmount || 0),
            // Project expenses
            totalExpenseApproved,
            totalExpensePaid,
            totalExpensePending,
            // Manual transactions
            manualIncome: income._sum.amount || 0,
            manualExpense: expense._sum.amount || 0,
            // Net cashflow
            netCashflow: (receivables._sum.paidAmount || 0) + (income._sum.amount || 0)
                - (payables._sum.paidAmount || 0) - totalExpensePaid - (expense._sum.amount || 0),
        },
    });
});

export const POST = withAuth(async (request) => {
    const data = await request.json();
    if (!data.description?.trim()) return NextResponse.json({ error: 'Mô tả bắt buộc' }, { status: 400 });
    const code = await generateCode('transaction', 'GD');
    const tx = await prisma.transaction.create({
        data: {
            code,
            type: data.type || 'Thu',
            description: data.description.trim(),
            amount: Number(data.amount) || 0,
            category: data.category || '',
            date: data.date ? new Date(data.date) : new Date(),
            projectId: data.projectId || null,
        },
    });
    return NextResponse.json(tx, { status: 201 });
});
