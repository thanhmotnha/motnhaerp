import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const yearParam = parseInt(searchParams.get('year'), 10);
    const year = Number.isFinite(yearParam) ? yearParam : new Date().getFullYear();
    const projectId = searchParams.get('projectId') || null;

    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    // Mode: projectId → trả allocations của 1 dự án
    if (projectId) {
        const allocations = await prisma.overheadAllocation.findMany({
            where: {
                projectId,
                batch: {
                    status: 'confirmed',
                    confirmedAt: { gte: start, lt: end },
                },
            },
            include: {
                batch: {
                    select: { id: true, code: true, name: true, period: true, confirmedAt: true, totalAmount: true },
                },
            },
            orderBy: { batch: { period: 'asc' } },
        });

        const total = allocations.reduce((s, a) => s + a.amount, 0);
        return NextResponse.json({
            year,
            allocations: allocations.map(a => ({
                batchId: a.batchId,
                batchCode: a.batch.code,
                batchName: a.batch.name,
                period: a.batch.period,
                totalBatchAmount: a.batch.totalAmount,
                confirmedAt: a.batch.confirmedAt,
                amount: a.amount,
                ratio: a.ratio,
            })),
            total,
        });
    }

    // Mode: toàn bộ → trả batches + allocations grouped
    const batches = await prisma.overheadBatch.findMany({
        where: {
            status: 'confirmed',
            confirmedAt: { gte: start, lt: end },
            deletedAt: null,
        },
        include: {
            allocations: {
                include: {
                    project: { select: { id: true, code: true, name: true } },
                },
                orderBy: { amount: 'desc' },
            },
        },
        orderBy: { period: 'asc' },
    });

    // Build unique projects list with totals
    const projectMap = {};
    for (const batch of batches) {
        for (const alloc of batch.allocations) {
            const p = alloc.project;
            if (!projectMap[p.id]) {
                projectMap[p.id] = { id: p.id, code: p.code, name: p.name, totalAllocated: 0 };
            }
            projectMap[p.id].totalAllocated += alloc.amount;
        }
    }

    return NextResponse.json({
        year,
        batches: batches.map(b => ({
            id: b.id,
            code: b.code,
            name: b.name,
            period: b.period,
            totalAmount: b.totalAmount,
            confirmedAt: b.confirmedAt,
            allocations: b.allocations.map(a => ({
                projectId: a.projectId,
                projectCode: a.project.code,
                projectName: a.project.name,
                amount: a.amount,
                ratio: a.ratio,
            })),
        })),
        projects: Object.values(projectMap).sort((a, b) => b.totalAllocated - a.totalAllocated),
    });
}, { roles: ["giam_doc", "ke_toan"] });
