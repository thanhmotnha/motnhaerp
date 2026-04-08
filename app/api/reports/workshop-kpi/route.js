import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET workshop KPI: WIP, throughput, on-time rate
// ?year=2026
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear());
    const from = new Date(year, 0, 1);
    const to = new Date(year, 11, 31, 23, 59, 59);

    const workshops = await prisma.workshop.findMany({
        where: { isActive: true },
        include: {
            batches: {
                where: { createdAt: { gte: from, lte: to } },
                include: { batchItems: true },
            },
        },
    });

    const kpis = workshops.map(w => {
        const batches = w.batches || [];
        const completed = batches.filter(b => b.status === 'completed');
        const inProgress = batches.filter(b => b.status === 'in_progress');
        const cancelled = batches.filter(b => b.status === 'cancelled');

        // On-time: completed before or on plannedEndDate
        const onTime = completed.filter(b =>
            b.plannedEndDate && b.actualEndDate && new Date(b.actualEndDate) <= new Date(b.plannedEndDate)
        );
        const onTimeRate = completed.length > 0 ? Math.round((onTime.length / completed.length) * 100) : null;

        // Avg cycle time (days from actualStart to actualEnd)
        const cycleTimes = completed
            .filter(b => b.actualStartDate && b.actualEndDate)
            .map(b => Math.round((new Date(b.actualEndDate) - new Date(b.actualStartDate)) / (1000 * 60 * 60 * 24)));
        const avgCycleTime = cycleTimes.length > 0 ? Math.round(cycleTimes.reduce((s, v) => s + v, 0) / cycleTimes.length) : null;

        // QC metrics
        const allBatchItems = batches.flatMap(b => b.batchItems || []);
        const totalProduced = allBatchItems.reduce((s, bi) => s + (bi.completedQty || 0), 0);
        const totalPassed = allBatchItems.reduce((s, bi) => s + (bi.qcPassedQty || 0), 0);
        const totalFailed = allBatchItems.reduce((s, bi) => s + (bi.qcFailedQty || 0), 0);
        const qcPassRate = totalProduced > 0 ? Math.round((totalPassed / totalProduced) * 100) : null;

        return {
            workshopId: w.id,
            workshopCode: w.code,
            workshopName: w.name,
            capacity: w.capacity,
            totalBatches: batches.length,
            completedBatches: completed.length,
            inProgressBatches: inProgress.length,
            cancelledBatches: cancelled.length,
            onTimeRate,
            avgCycleTime,
            totalProduced,
            totalPassed,
            totalFailed,
            qcPassRate,
        };
    });

    return NextResponse.json({ year, workshops: kpis });
}, { roles: ['giam_doc', 'ke_toan'] });
