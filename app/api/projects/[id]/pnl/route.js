import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/projects/[id]/pnl
// Returns P&L breakdown for a specific project
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;

    // Projects may be referenced by id or by code (DA-001)
    const project = await prisma.project.findFirst({
        where: { OR: [{ id }, { code: id }] },
        select: { id: true, code: true, name: true },
    });
    if (!project) return NextResponse.json({ error: 'Dự án không tồn tại' }, { status: 404 });

    const projectId = project.id;

    const [
        contracts,
        directExpenses,
        allocatedExpenses,
        contractorPays,
        purchaseOrders,
        supplierDebts,
        contractorDebts,
    ] = await Promise.all([
        // Revenue: contract payments received
        prisma.contract.findMany({
            where: { projectId, deletedAt: null, status: { not: 'Nháp' } },
            include: { payments: true },
        }),
        // Cost: chi phí trực tiếp (không phân bổ)
        prisma.projectExpense.findMany({
            where: { projectId, deletedAt: null, status: { not: 'Từ chối' }, allocations: { none: {} } },
            select: { amount: true, paidAmount: true, category: true, status: true },
        }),
        // Cost: chi phí phân bổ vào dự án này
        prisma.expenseAllocation.findMany({
            where: { projectId, expense: { status: { not: 'Từ chối' }, deletedAt: null } },
            select: {
                amount: true,
                expense: { select: { category: true, paidAmount: true, amount: true } },
            },
        }),
        // Cost: contractor payments
        prisma.contractorPayment.findMany({
            where: { projectId },
            select: { contractAmount: true, paidAmount: true, retentionAmount: true },
        }),
        // Cost: purchase orders
        prisma.purchaseOrder.findMany({
            where: { projectId },
            select: { totalAmount: true, paidAmount: true, status: true },
        }),
        // Service debt (supplier) chưa thanh toán có phân bổ vào dự án
        prisma.supplierDebt.findMany({
            where: { status: { in: ['open', 'partial'] }, allocationPlan: { not: null } },
            select: { totalAmount: true, paidAmount: true, allocationPlan: true },
        }),
        // Service debt (contractor) chưa thanh toán có phân bổ vào dự án
        prisma.contractorDebt.findMany({
            where: { status: { in: ['open', 'partial'] }, allocationPlan: { not: null } },
            select: { totalAmount: true, paidAmount: true, allocationPlan: true },
        }),
    ]);

    // Gộp expenses: trực tiếp + phân bổ thành cùng format
    // Với allocated expense, paidAmount được tính pro-rata theo tỉ lệ amount/expense.amount
    const expenses = [
        ...directExpenses,
        ...allocatedExpenses.map(a => {
            const expAmount = a.expense?.amount || 0;
            const expPaid = a.expense?.paidAmount || 0;
            const ratio = expAmount > 0 ? (a.amount || 0) / expAmount : 0;
            const paidShare = expPaid * ratio;
            return {
                amount: a.amount,
                paidAmount: paidShare,
                category: a.expense?.category,
                status: 'Đã duyệt',
            };
        }),
    ];

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

    // === Pending service debt (cash-basis chưa trả) phân bổ về dự án này ===
    const computeShare = (debt) => {
        const remaining = Math.max(0, (debt.totalAmount || 0) - (debt.paidAmount || 0));
        const plan = Array.isArray(debt.allocationPlan) ? debt.allocationPlan : [];
        const entry = plan.find(a => a && a.projectId === projectId);
        const ratio = entry && typeof entry.ratio === 'number' ? entry.ratio : 0;
        return remaining * ratio;
    };
    const pendingServiceDebt =
        supplierDebts.reduce((s, d) => s + computeShare(d), 0) +
        contractorDebts.reduce((s, d) => s + computeShare(d), 0);

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
        pendingServiceDebt,
    });
}, { roles: ['giam_doc', 'ke_toan'] });
