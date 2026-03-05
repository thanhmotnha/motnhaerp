import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/reports/portfolio
// Returns cross-project KPIs and per-project summary for the portfolio view
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';

    const where = { deletedAt: null };
    if (status) where.status = status;

    const projects = await prisma.project.findMany({
        where,
        include: {
            customer: { select: { name: true } },
            expenses: { select: { amount: true, paidAmount: true, status: true }, where: { deletedAt: null } },
            contractorPays: { select: { contractAmount: true, paidAmount: true } },
            purchaseOrders: { select: { totalAmount: true, paidAmount: true }, where: { status: { not: 'Hủy' } } },
        },
        orderBy: { createdAt: 'desc' },
    });

    const rows = projects.map(p => {
        const totalCost =
            p.expenses.reduce((s, e) => s + e.amount, 0) +
            p.contractorPays.reduce((s, c) => s + c.contractAmount, 0) +
            p.purchaseOrders.reduce((s, o) => s + o.totalAmount, 0);

        const totalPaid =
            p.expenses.reduce((s, e) => s + e.paidAmount, 0) +
            p.contractorPays.reduce((s, c) => s + c.paidAmount, 0) +
            p.purchaseOrders.reduce((s, o) => s + o.paidAmount, 0);

        const revenue = p.contractValue;
        const grossProfit = revenue - totalCost;
        const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
        const costPerSqm = p.area > 0 ? totalCost / p.area : 0;

        return {
            id: p.id,
            code: p.code,
            name: p.name,
            type: p.type,
            status: p.status,
            phase: p.phase,
            progress: p.progress,
            area: p.area,
            budget: p.budget,
            contractValue: revenue,
            paidAmount: p.paidAmount,
            totalCost,
            totalPaid,
            grossProfit,
            margin: Math.round(margin * 10) / 10,
            costPerSqm: Math.round(costPerSqm),
            startDate: p.startDate,
            endDate: p.endDate,
            customer: p.customer,
        };
    });

    // Portfolio-level KPIs
    const active = rows.filter(r => ['Thi công', 'Thiết kế', 'Đang thực hiện'].includes(r.status));
    const portfolioRevenue = rows.reduce((s, r) => s + r.contractValue, 0);
    const portfolioCost = rows.reduce((s, r) => s + r.totalCost, 0);
    const portfolioProfit = portfolioRevenue - portfolioCost;
    const avgMargin = rows.length > 0 ? rows.reduce((s, r) => s + r.margin, 0) / rows.length : 0;

    // Cost benchmark by project type (cost/m²)
    const typeMap = {};
    for (const r of rows) {
        if (!r.area || r.area <= 0) continue;
        if (!typeMap[r.type]) typeMap[r.type] = { totalCost: 0, totalArea: 0, count: 0 };
        typeMap[r.type].totalCost += r.totalCost;
        typeMap[r.type].totalArea += r.area;
        typeMap[r.type].count += 1;
    }
    const benchmark = Object.entries(typeMap).map(([type, v]) => ({
        type,
        avgCostPerSqm: v.totalArea > 0 ? Math.round(v.totalCost / v.totalArea) : 0,
        count: v.count,
    })).sort((a, b) => b.avgCostPerSqm - a.avgCostPerSqm);

    return NextResponse.json({
        kpis: {
            total: rows.length,
            active: active.length,
            portfolioRevenue,
            portfolioCost,
            portfolioProfit,
            avgMargin: Math.round(avgMargin * 10) / 10,
        },
        projects: rows,
        benchmark,
    });
}, { roles: ['giam_doc', 'pho_gd', 'ke_toan'] });
