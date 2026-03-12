import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/projects/[id]/pnl
// Returns P&L breakdown for a specific project
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;

    const [
        contracts,
        expenses,
        contractorPays,
        purchaseOrders,
    ] = await Promise.all([
        // Revenue: contract payments received
        prisma.contract.findMany({
            where: { projectId: id, deletedAt: null, status: { not: 'Nháp' } },
            include: { payments: true },
        }),
        // Cost: project expenses (approved/paid)
        prisma.projectExpense.findMany({
            where: { projectId: id, deletedAt: null, status: { not: 'Từ chối' } },
            select: { amount: true, paidAmount: true, category: true, status: true },
        }),
        // Cost: contractor payments
        prisma.contractorPayment.findMany({
            where: { projectId: id },
            select: { contractAmount: true, paidAmount: true, retentionAmount: true },
        }),
        // Cost: purchase orders
        prisma.purchaseOrder.findMany({
            where: { projectId: id },
            select: { totalAmount: true, paidAmount: true, status: true },
        }),
    ]);

    // === Revenue ===
    const contractValue = contracts.reduce((s, c) => s + (c.contractValue || 0), 0);
    const variationAmount = contracts.reduce((s, c) => s + (c.variationAmount || 0), 0);
    const totalRevenue = contractValue + variationAmount;

    const revenueCollected = contracts.reduce((s, c) =>
        s + c.payments.reduce((ps, p) => ps + (p.paidAmount || 0), 0), 0);
    const revenueOutstanding = contracts.reduce((s, c) =>
        s + c.payments.reduce((ps, p) => ps + Math.max(0, (p.amount || 0) - (p.paidAmount || 0)), 0), 0);

    // === Costs by category ===
    const expenseByCategory = {};
    for (const e of expenses) {
        const cat = e.category || 'Khác';
        if (!expenseByCategory[cat]) expenseByCategory[cat] = { amount: 0, paid: 0 };
        expenseByCategory[cat].amount += e.amount || 0;
        expenseByCategory[cat].paid += e.paidAmount || 0;
    }

    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const totalExpensesPaid = expenses.reduce((s, e) => s + (e.paidAmount || 0), 0);

    const totalContractorCost = contractorPays.reduce((s, p) => s + (p.contractAmount || 0), 0);
    const totalContractorPaid = contractorPays.reduce((s, p) => s + (p.paidAmount || 0), 0);
    const totalRetention = contractorPays.reduce((s, p) => s + (p.retentionAmount || 0), 0);

    const totalPOCost = purchaseOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const totalPOPaid = purchaseOrders.reduce((s, o) => s + (o.paidAmount || 0), 0);

    // === P&L ===
    const totalCost = totalExpenses + totalContractorCost + totalPOCost;
    const totalCostPaid = totalExpensesPaid + totalContractorPaid + totalPOPaid;
    const grossProfit = totalRevenue - totalCost;
    const grossMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;
    const cashProfit = revenueCollected - totalCostPaid;

    return NextResponse.json({
        revenue: {
            contractValue,
            variationAmount,
            totalRevenue,
            revenueCollected,
            revenueOutstanding,
            contracts: contracts.map(c => ({
                id: c.id, code: c.code, name: c.name,
                contractValue: c.contractValue, variationAmount: c.variationAmount,
                paidAmount: c.payments.reduce((s, p) => s + (p.paidAmount || 0), 0),
            })),
        },
        costs: {
            totalExpenses,
            totalExpensesPaid,
            expenseByCategory,
            totalContractorCost,
            totalContractorPaid,
            totalRetention,
            totalPOCost,
            totalPOPaid,
            totalCost,
            totalCostPaid,
        },
        summary: {
            totalRevenue,
            totalCost,
            grossProfit,
            grossMargin,
            revenueCollected,
            totalCostPaid,
            cashProfit,
        },
    });
});
