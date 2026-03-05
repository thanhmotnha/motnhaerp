import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear());

    const projects = await prisma.project.findMany({
        where: { deletedAt: null },
        select: {
            id: true, code: true, name: true, status: true, startDate: true, endDate: true,
            customer: { select: { name: true } },
            contracts: {
                where: { deletedAt: null },
                select: {
                    contractValue: true, paidAmount: true,
                    payments: { select: { amount: true, paidAmount: true, status: true } },
                },
            },
            contractorPays: {
                select: { contractAmount: true, paidAmount: true, netAmount: true },
            },
            purchaseOrders: {
                select: { totalAmount: true, paidAmount: true },
            },
            expenses: {
                where: { deletedAt: null },
                select: { amount: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    const rows = projects.map(p => {
        const contractValue = p.contracts.reduce((s, c) => s + (c.contractValue || 0), 0);
        const paidByCustomer = p.contracts.reduce((s, c) => s + (c.paidAmount || 0), 0);
        const remainReceivable = Math.max(0, contractValue - paidByCustomer);

        const contractorCost = p.contractorPays.reduce((s, cp) => s + (cp.paidAmount || 0), 0);
        const poCost = p.purchaseOrders.reduce((s, po) => s + (po.paidAmount || 0), 0);
        const expenseCost = p.expenses.reduce((s, e) => s + (e.amount || 0), 0);
        const totalCost = contractorCost + poCost + expenseCost;

        const grossProfit = paidByCustomer - totalCost;
        const margin = contractValue > 0 ? Math.round((grossProfit / contractValue) * 100) : 0;

        return {
            id: p.id,
            code: p.code,
            name: p.name,
            status: p.status,
            customerName: p.customer?.name || '',
            contractValue,
            paidByCustomer,
            remainReceivable,
            contractorCost,
            poCost,
            expenseCost,
            totalCost,
            grossProfit,
            margin,
            alert: margin < 10 && contractValue > 0,
        };
    });

    const summary = {
        totalContractValue: rows.reduce((s, r) => s + r.contractValue, 0),
        totalPaid: rows.reduce((s, r) => s + r.paidByCustomer, 0),
        totalCost: rows.reduce((s, r) => s + r.totalCost, 0),
        totalProfit: rows.reduce((s, r) => s + r.grossProfit, 0),
        alertCount: rows.filter(r => r.alert).length,
    };

    return NextResponse.json({ rows, summary });
});
