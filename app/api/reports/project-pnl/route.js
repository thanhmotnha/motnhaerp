import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const GROUP_MAP = {
    'Thiết kế kiến trúc': 'Thiết kế',
    'Thiết kế nội thất': 'Thiết kế',
    'Thi công nội thất': 'Nội thất',
    'Thi công thô': 'Thi công',
    'Thi công hoàn thiện': 'Thi công',
};

export const GET = withAuth(async () => {
    const projects = await prisma.project.findMany({
        where: { deletedAt: null },
        select: {
            id: true, code: true, name: true, status: true,
            customer: { select: { name: true } },
            contracts: {
                where: { deletedAt: null, status: { not: 'Nháp' } },
                select: {
                    type: true,
                    contractValue: true,
                    paidAmount: true,
                },
            },
            contractorPays: {
                select: { paidAmount: true },
            },
            purchaseOrders: {
                select: { paidAmount: true },
            },
            expenses: {
                where: { deletedAt: null, status: { not: 'Từ chối' } },
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

        // Nhóm theo HĐ có contractValue lớn nhất
        const dominantContract = p.contracts.reduce(
            (max, c) => (c.contractValue || 0) > (max?.contractValue || 0) ? c : max,
            null
        );
        const groupType = GROUP_MAP[dominantContract?.type] || 'Thi công';

        return {
            id: p.id,
            code: p.code,
            name: p.name,
            status: p.status,
            customerName: p.customer?.name || '',
            groupType,
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
        totalRemain: rows.reduce((s, r) => s + r.remainReceivable, 0),
        totalCost: rows.reduce((s, r) => s + r.totalCost, 0),
        totalProfit: rows.reduce((s, r) => s + r.grossProfit, 0),
        alertCount: rows.filter(r => r.alert).length,
    };

    return NextResponse.json({ rows, summary });
});
