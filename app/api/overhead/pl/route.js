import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const yearParam = parseInt(searchParams.get('year'), 10);
    const year = Number.isFinite(yearParam) ? yearParam : new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);

    // Active projects (soft-delete auto-filtered at top level by Prisma extension)
    const projects = await prisma.project.findMany({
        where: { status: { notIn: ['Hủy'] } },
        select: {
            id: true, name: true, code: true, contractValue: true, paidAmount: true,
            expenses: {
                where: {
                    deletedAt: null,
                    status: { in: ['Đã duyệt', 'Đã chi', 'Hoàn thành'] },
                    date: { gte: start, lt: new Date(year + 1, 0, 1) },  // scoped to year
                },
                select: { amount: true },
            },
            overheadAllocations: {
                where: {
                    batch: {
                        status: 'confirmed',
                        confirmedAt: { gte: start, lt: new Date(year + 1, 0, 1) },
                    },
                },
                select: { amount: true },
            },
        },
    });

    // Confirmed batches in year (for reference in the response)
    const batches = await prisma.overheadBatch.findMany({
        where: {
            status: 'confirmed',
            confirmedAt: { gte: start, lte: end },
        },
        select: { id: true, code: true, name: true, period: true, totalAmount: true, confirmedAt: true },
    });

    const projectPL = projects.map(p => {
        const directCost = p.expenses.reduce((s, e) => s + e.amount, 0);
        const overheadCost = p.overheadAllocations.reduce((s, a) => s + a.amount, 0);
        const revenue = p.paidAmount;
        const grossProfit = revenue - directCost - overheadCost;
        return {
            id: p.id,
            name: p.name,
            code: p.code,
            contractValue: p.contractValue,
            revenue,
            directCost,
            overheadCost,
            grossProfit,
            margin: revenue > 0 ? parseFloat(((grossProfit / revenue) * 100).toFixed(1)) : 0,
        };
    });

    const totalRevenue = projectPL.reduce((s, p) => s + p.revenue, 0);
    const totalDirectCost = projectPL.reduce((s, p) => s + p.directCost, 0);
    const totalOverheadCost = projectPL.reduce((s, p) => s + p.overheadCost, 0);
    const totalGrossProfit = totalRevenue - totalDirectCost - totalOverheadCost;

    return NextResponse.json({
        year,
        summary: { totalRevenue, totalDirectCost, totalOverheadCost, totalGrossProfit },
        projects: projectPL,
        batches,
    });
}, { roles: ["giam_doc", "ke_toan"] });
