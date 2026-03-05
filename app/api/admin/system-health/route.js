import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async () => {
    const start = Date.now();

    // Parallel count queries for all major entities
    const [
        projectCount, customerCount, contractCount, quotationCount,
        poCount, employeeCount, workOrderCount, userCount,
    ] = await Promise.all([
        prisma.project.count({ where: { deletedAt: null } }),
        prisma.customer.count({ where: { deletedAt: null } }),
        prisma.contract.count({ where: { deletedAt: null } }),
        prisma.quotation.count({ where: { deletedAt: null } }),
        prisma.purchaseOrder.count(),
        prisma.employee.count({ where: { status: 'Đang làm', deletedAt: null } }),
        prisma.workOrder.count({ where: { deletedAt: null } }),
        prisma.user.count({ where: { active: true } }),
    ]);

    // Recent site logs as activity proxy
    const recentLogs = await prisma.siteLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
            id: true,
            createdBy: true,
            weather: true,
            createdAt: true,
            project: { select: { code: true, name: true } },
        },
    }).catch(() => []);

    // Recent progress reports
    const recentReports = await prisma.progressReport.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
            id: true,
            description: true,
            createdAt: true,
            project: { select: { code: true, name: true } },
        },
    }).catch(() => []);

    // Work orders activity last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekWOs = await prisma.workOrder.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true, status: true },
        orderBy: { createdAt: 'asc' },
    }).catch(() => []);

    // Group by date
    const activityByDay = {};
    for (const wo of weekWOs) {
        const d = new Date(wo.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        activityByDay[d] = (activityByDay[d] || 0) + 1;
    }

    // Pending counts
    const [pendingPOs, pendingExpenses, overdueWOs] = await Promise.all([
        prisma.purchaseOrder.count({ where: { status: 'Chờ duyệt' } }),
        prisma.projectExpense.count({ where: { status: 'Chờ duyệt' } }),
        prisma.workOrder.count({
            where: { dueDate: { lt: new Date() }, status: { notIn: ['Hoàn thành', 'Đã hủy'] }, deletedAt: null },
        }),
    ]).catch(() => [0, 0, 0]);

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
        alerts: {
            pendingPOs,
            pendingExpenses,
            overdueWOs,
        },
        recentLogs,
        recentReports,
        activityByDay,
        totalActivity7d: weekWOs.length,
    });
}, { roles: ['giam_doc'] });
