import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/reports/project-settlement/[id] — Quyết toán dự án
export const GET = withAuth(async (request, context, session) => {
    const { id } = await context.params;

    const project = await prisma.project.findUnique({
        where: { id },
        include: {
            customer: { select: { name: true, phone: true } },
            milestones: { orderBy: { order: 'asc' } },
        },
    });

    if (!project || project.deletedAt) {
        return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });
    }

    // Revenue: contract payments
    const contracts = await prisma.contract.findMany({
        where: { projectId: id, deletedAt: null, status: { not: 'Nháp' } },
        include: {
            payments: { orderBy: { createdAt: 'asc' } },
            addenda: true,
        },
    });

    const totalContractValue = contracts.reduce((s, c) => s + (c.contractValue || 0), 0);
    const totalVariation = contracts.reduce((s, c) => s + (c.variationAmount || 0), 0);
    const totalReceived = contracts.reduce((s, c) => s + (c.paidAmount || 0), 0);
    const totalAddenda = contracts.reduce((s, c) => s + c.addenda.reduce((a, d) => a + (d.amount || 0), 0), 0);

    // Costs breakdown
    const [expenses, purchaseOrders, contractorPayments, budgets] = await Promise.all([
        prisma.projectExpense.findMany({
            where: { projectId: id, deletedAt: null, status: { not: 'Từ chối' } },
            select: { id: true, code: true, description: true, amount: true, category: true, date: true },
            orderBy: { date: 'desc' },
        }),
        prisma.purchaseOrder.findMany({
            where: { projectId: id, status: { in: ['Đã duyệt', 'Đã giao', 'Hoàn thành'] } },
            select: { id: true, code: true, supplier: true, totalAmount: true, paidAmount: true, status: true },
        }),
        prisma.contractorPayment.findMany({
            where: { projectId: id },
            select: {
                id: true, contractAmount: true, paidAmount: true, netAmount: true,
                phase: true, status: true, retentionAmount: true, retentionReleased: true,
                contractor: { select: { name: true } },
            },
        }),
        prisma.projectBudget.findMany({
            where: { projectId: id },
            select: { category: true, budgetAmount: true, actualAmount: true },
        }),
    ]);

    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const totalPO = purchaseOrders.reduce((s, p) => s + (p.totalAmount || 0), 0);
    const totalContractor = contractorPayments.reduce((s, c) => s + (c.netAmount || c.contractAmount || 0), 0);
    const totalRetention = contractorPayments.reduce((s, c) => s + (c.retentionAmount || 0), 0);
    const totalCost = totalExpenses + totalPO + totalContractor;

    // Budget vs Actual
    const totalBudget = budgets.reduce((s, b) => s + (b.budgetAmount || 0), 0) || project.budget;
    const budgetVariance = totalBudget - totalCost;

    // Expense by category
    const expenseByCategory = {};
    for (const e of expenses) {
        const cat = e.category || 'Khác';
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (e.amount || 0);
    }

    return NextResponse.json({
        project: {
            id: project.id,
            code: project.code,
            name: project.name,
            status: project.status,
            customer: project.customer?.name,
            progress: project.progress,
            startDate: project.startDate,
            endDate: project.endDate,
        },
        revenue: {
            contractValue: totalContractValue,
            variations: totalVariation,
            addenda: totalAddenda,
            totalValue: totalContractValue + totalVariation + totalAddenda,
            received: totalReceived,
            outstanding: totalContractValue + totalVariation + totalAddenda - totalReceived,
        },
        costs: {
            expenses: totalExpenses,
            purchaseOrders: totalPO,
            contractorPayments: totalContractor,
            retention: totalRetention,
            totalCost,
            byCategory: expenseByCategory,
        },
        profitability: {
            grossProfit: totalReceived - totalCost,
            grossMargin: totalReceived > 0 ? Math.round((totalReceived - totalCost) / totalReceived * 100) : 0,
            budget: totalBudget,
            budgetVariance,
            budgetUtilization: totalBudget > 0 ? Math.round(totalCost / totalBudget * 100) : 0,
        },
        milestones: project.milestones,
        details: {
            expenses: expenses.slice(0, 20),
            purchaseOrders,
            contractorPayments,
            contracts: contracts.map(c => ({
                id: c.id, code: c.code, name: c.name, value: c.contractValue,
                paid: c.paidAmount, payments: c.payments.length,
            })),
        },
    });
}, { roles: ['giam_doc', 'pho_gd', 'ke_toan'] });
