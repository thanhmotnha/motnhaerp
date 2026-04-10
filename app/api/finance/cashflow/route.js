import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/finance/cashflow?months=12
// Returns monthly cash inflow and outflow for the past N months
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '12');

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    // Fetch all relevant data in parallel
    const [contractPayments, contractorPays, poPayments, expenses, manualTx] = await Promise.all([
        // Cash IN: contract payments received (by paidDate or createdAt)
        prisma.contractPayment.findMany({
            where: {
                status: { in: ['Đã thu', 'Thu một phần'] },
                paidAmount: { gt: 0 },
            },
            select: { paidAmount: true, paidDate: true, createdAt: true },
        }),

        // Cash OUT: contractor payments
        prisma.contractorPayment.findMany({
            where: {
                paidAmount: { gt: 0 },
                approvedAt: { gte: startDate },
            },
            select: { paidAmount: true, approvedAt: true, updatedAt: true },
        }),

        // Cash OUT: purchase orders paid
        prisma.purchaseOrder.findMany({
            where: {
                paidAmount: { gt: 0 },
                updatedAt: { gte: startDate },
            },
            select: { paidAmount: true, updatedAt: true },
        }),

        // Cash OUT: project expenses paid
        prisma.projectExpense.findMany({
            where: {
                paidAmount: { gt: 0 },
                status: { in: ['Đã chi', 'Hoàn thành'] },
                updatedAt: { gte: startDate },
            },
            select: { paidAmount: true, date: true, updatedAt: true },
        }),

        // Manual transactions
        prisma.transaction.findMany({
            where: { date: { gte: startDate } },
            select: { type: true, amount: true, date: true, category: true },
        }),
    ]);

    // Build monthly buckets
    const buckets = {};
    for (let i = 0; i < months; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        buckets[key] = { label: `T${d.getMonth() + 1}/${d.getFullYear()}`, inflow: 0, outflow: 0, net: 0 };
    }

    const getKey = (dateVal) => {
        if (!dateVal) return null;
        const d = new Date(dateVal);
        if (d < startDate) return null;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    for (const p of contractPayments) {
        const key = getKey(p.paidDate || p.createdAt);
        if (key && buckets[key]) buckets[key].inflow += p.paidAmount || 0;
    }
    for (const p of contractorPays) {
        const key = getKey(p.approvedAt || p.updatedAt);
        if (key && buckets[key]) buckets[key].outflow += p.paidAmount || 0;
    }
    for (const o of poPayments) {
        const key = getKey(o.updatedAt);
        if (key && buckets[key]) buckets[key].outflow += o.paidAmount || 0;
    }
    for (const e of expenses) {
        const key = getKey(e.date || e.updatedAt);
        if (key && buckets[key]) buckets[key].outflow += e.paidAmount || 0;
    }
    for (const tx of manualTx) {
        const key = getKey(tx.date);
        if (key && buckets[key]) {
            if (tx.type === 'Thu') buckets[key].inflow += tx.amount || 0;
            else buckets[key].outflow += tx.amount || 0;
        }
    }

    // Compute net and running balance
    let runningBalance = 0;
    const result = Object.entries(buckets).map(([key, b]) => {
        b.net = b.inflow - b.outflow;
        runningBalance += b.net;
        return { ...b, key, runningBalance };
    });

    return NextResponse.json({
        months: result,
        totals: {
            inflow: result.reduce((s, m) => s + m.inflow, 0),
            outflow: result.reduce((s, m) => s + m.outflow, 0),
            net: result.reduce((s, m) => s + m.net, 0),
        },
    });
}, { roles: ['giam_doc', 'ke_toan'] });
