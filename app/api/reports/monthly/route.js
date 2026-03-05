import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear());

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);

    // Doanh thu: contractPayment đã thu + transaction Thu
    const [contractPayments, transactions, expenses, contractorPayments, poPayments] = await Promise.all([
        prisma.contractPayment.findMany({
            where: {
                status: { in: ['Đã thu', 'Đã thanh toán'] },
                paidAt: { gte: startOfYear, lt: endOfYear },
            },
            select: { paidAmount: true, paidAt: true },
        }),
        prisma.transaction.findMany({
            where: { date: { gte: startOfYear, lt: endOfYear } },
            select: { amount: true, type: true, date: true, category: true },
        }),
        prisma.projectExpense.findMany({
            where: {
                status: { in: ['Đã chi', 'Hoàn thành'] },
                date: { gte: startOfYear, lt: endOfYear },
            },
            select: { amount: true, date: true },
        }),
        prisma.contractorPayment.findMany({
            where: {
                status: 'paid',
                updatedAt: { gte: startOfYear, lt: endOfYear },
            },
            select: { paidAmount: true, updatedAt: true },
        }),
        prisma.purchaseOrder.findMany({
            where: {
                status: { in: ['Đã nhận', 'Hoàn thành'] },
                updatedAt: { gte: startOfYear, lt: endOfYear },
            },
            select: { paidAmount: true, updatedAt: true },
        }),
    ]);

    // Build monthly buckets
    const months = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        label: `T${i + 1}`,
        revenue: 0,
        expense: 0,
    }));

    // Revenue from contract payments
    for (const cp of contractPayments) {
        if (!cp.paidAt) continue;
        const m = new Date(cp.paidAt).getMonth();
        months[m].revenue += cp.paidAmount || 0;
    }

    // Revenue/expense from manual transactions
    for (const tx of transactions) {
        const m = new Date(tx.date).getMonth();
        if (tx.type === 'Thu') months[m].revenue += tx.amount || 0;
        else months[m].expense += tx.amount || 0;
    }

    // Expense from project expenses
    for (const e of expenses) {
        const m = new Date(e.date).getMonth();
        months[m].expense += e.amount || 0;
    }

    // Expense from contractor payments
    for (const cp of contractorPayments) {
        const m = new Date(cp.updatedAt).getMonth();
        months[m].expense += cp.paidAmount || 0;
    }

    // Expense from PO payments
    for (const po of poPayments) {
        const m = new Date(po.updatedAt).getMonth();
        months[m].expense += po.paidAmount || 0;
    }

    // Add profit and cumulative
    let cumRevenue = 0;
    let cumExpense = 0;
    const result = months.map(m => {
        cumRevenue += m.revenue;
        cumExpense += m.expense;
        return {
            ...m,
            profit: m.revenue - m.expense,
            cumRevenue,
            cumExpense,
        };
    });

    const totalRevenue = months.reduce((s, m) => s + m.revenue, 0);
    const totalExpense = months.reduce((s, m) => s + m.expense, 0);

    return NextResponse.json({
        year,
        months: result,
        summary: {
            totalRevenue,
            totalExpense,
            totalProfit: totalRevenue - totalExpense,
        },
    });
});
