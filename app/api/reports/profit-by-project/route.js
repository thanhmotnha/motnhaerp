import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/reports/profit-by-project — Lãi/lỗ theo từng dự án
export const GET = withAuth(async (request, context, session) => {
    const projects = await prisma.project.findMany({
        where: { deletedAt: null },
        select: {
            id: true,
            code: true,
            name: true,
            status: true,
            contractValue: true,
            paidAmount: true,
            budget: true,
            spent: true,
            progress: true,
            manager: true,
            customer: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
    });

    // Lấy chi phí thực tế từ nhiều nguồn
    const projectIds = projects.map(p => p.id);

    const [directExpenses, allocatedExpenses, poBYProject, contractorByProject] = await Promise.all([
        // Chi phí trực tiếp (không có phân bổ)
        prisma.projectExpense.groupBy({
            by: ['projectId'],
            where: {
                projectId: { in: projectIds },
                status: { not: 'Từ chối' },
                deletedAt: null,
                allocations: { none: {} },
            },
            _sum: { amount: true },
        }),
        // Chi phí phân bổ qua ExpenseAllocation
        prisma.expenseAllocation.groupBy({
            by: ['projectId'],
            where: {
                projectId: { in: projectIds },
                expense: { status: { not: 'Từ chối' }, deletedAt: null },
            },
            _sum: { amount: true },
        }),
        // PO đã duyệt
        prisma.purchaseOrder.groupBy({
            by: ['projectId'],
            where: { projectId: { in: projectIds }, status: { in: ['Đã duyệt', 'Đã giao', 'Hoàn thành'] } },
            _sum: { totalAmount: true },
        }),
        // Thanh toán thầu phụ
        prisma.contractorPayment.groupBy({
            by: ['projectId'],
            where: { projectId: { in: projectIds } },
            _sum: { netAmount: true },
        }),
    ]);

    // Map costs: gộp chi phí trực tiếp + phân bổ
    const expenseMap = {};
    for (const e of directExpenses) {
        if (e.projectId) expenseMap[e.projectId] = (expenseMap[e.projectId] || 0) + (e._sum.amount || 0);
    }
    for (const a of allocatedExpenses) {
        expenseMap[a.projectId] = (expenseMap[a.projectId] || 0) + (a._sum.amount || 0);
    }
    const poMap = Object.fromEntries(poBYProject.map(e => [e.projectId, e._sum.totalAmount || 0]));
    const contractorMap = Object.fromEntries(contractorByProject.map(e => [e.projectId, e._sum.netAmount || 0]));

    // Thu từ HĐ
    const contractPayments = await prisma.contract.findMany({
        where: { projectId: { in: projectIds }, deletedAt: null },
        select: {
            projectId: true,
            contractValue: true,
            paidAmount: true,
        },
    });
    const revenueMap = {};
    for (const c of contractPayments) {
        revenueMap[c.projectId] = (revenueMap[c.projectId] || 0) + (c.paidAmount || 0);
    }

    const result = projects.map(p => {
        const revenue = revenueMap[p.id] || p.paidAmount || 0;
        const totalCost = (expenseMap[p.id] || 0) + (poMap[p.id] || 0) + (contractorMap[p.id] || 0);
        const profit = revenue - totalCost;
        const margin = revenue > 0 ? Math.round(profit / revenue * 100) : 0;

        return {
            id: p.id,
            code: p.code,
            name: p.name,
            status: p.status,
            customer: p.customer?.name,
            manager: p.manager,
            progress: p.progress,
            contractValue: p.contractValue,
            revenue,
            expenses: expenseMap[p.id] || 0,
            purchaseOrders: poMap[p.id] || 0,
            contractorCosts: contractorMap[p.id] || 0,
            totalCost,
            profit,
            margin,
            budget: p.budget,
            budgetVariance: p.budget > 0 ? totalCost - p.budget : null,
        };
    });

    // Sort by profit desc
    result.sort((a, b) => b.profit - a.profit);

    const summary = {
        totalRevenue: result.reduce((s, r) => s + r.revenue, 0),
        totalCost: result.reduce((s, r) => s + r.totalCost, 0),
        totalProfit: result.reduce((s, r) => s + r.profit, 0),
        profitableCount: result.filter(r => r.profit > 0).length,
        lossCount: result.filter(r => r.profit < 0).length,
    };

    return NextResponse.json({ data: result, summary });
}, { roles: ['giam_doc', 'pho_gd', 'ke_toan'] });
