import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async () => {
    const start = Date.now();

    // Parallel count queries for all major entities
    const [
        projectCount, customerCount, contractCount, quotationCount,
        poCount, employeeCount, workOrderCount, userCount,
        recentLogs, errorLogs,
    ] = await Promise.all([
        prisma.project.count({ where: { deletedAt: null } }),
        prisma.customer.count(),
        prisma.contract.count(),
        prisma.quotation.count(),
        prisma.purchaseOrder.count(),
        prisma.employee.count({ where: { active: true } }),
        prisma.workOrder.count({ where: { deletedAt: null } }),
        prisma.user.count({ where: { active: true } }),
        prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
        prisma.activityLog.count({
            where: {
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                action: { in: ['DELETE', 'delete', 'REJECT', 'reject', 'ERROR', 'error'] },
            },
        }),
    ]);

    // Activity in the last 7 days grouped by day
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekActivity = await prisma.activityLog.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true, action: true },
        orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const activityByDay = {};
    for (const log of weekActivity) {
        const d = new Date(log.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        activityByDay[d] = (activityByDay[d] || 0) + 1;
    }

    const dbLatency = Date.now() - start;

    return NextResponse.json({
        status: 'ok',
        dbLatency,
        checkedAt: new Date().toISOString(),
        counts: {
            projects: projectCount,
            customers: customerCount,
            contracts: contractCount,
            quotations: quotationCount,
            purchaseOrders: poCount,
            employees: employeeCount,
            workOrders: workOrderCount,
            users: userCount,
        },
        recentLogs,
        errorLogs24h: errorLogs,
        activityByDay,
        totalActivity7d: weekActivity.length,
    });
}, { roles: ['giam_doc'] });
