import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    // Get project dates
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { startDate: true, endDate: true, budgetTotal: true },
    });

    // Get all cost events with dates
    const [poItems, directExpenses, allocatedExpenses, contractorPayments, materialPlans] = await Promise.all([
        prisma.purchaseOrderItem.findMany({
            where: { purchaseOrder: { projectId } },
            include: { purchaseOrder: { select: { orderDate: true, status: true } } },
        }),
        // Chi phí trực tiếp (không phân bổ)
        prisma.projectExpense.findMany({
            where: { projectId, status: { not: 'Từ chối' }, allocations: { none: {} } },
            select: { amount: true, date: true, createdAt: true },
        }),
        // Chi phí phân bổ vào dự án này
        prisma.expenseAllocation.findMany({
            where: { projectId, expense: { status: { not: 'Từ chối' }, deletedAt: null } },
            select: { amount: true, createdAt: true },
        }),
        prisma.contractorPayment.findMany({
            where: { projectId },
            select: { contractAmount: true, netAmount: true, paidAmount: true, status: true, createdAt: true },
        }),
        prisma.materialPlan.findMany({
            where: { projectId },
            select: { quantity: true, budgetUnitPrice: true, unitPrice: true, createdAt: true },
        }),
    ]);

    // Build timeline — group by week
    const events = [];

    // PO costs
    poItems.forEach(item => {
        const date = item.purchaseOrder?.orderDate || new Date();
        events.push({ date, type: 'actual', amount: item.quantity * item.unitPrice, label: 'PO' });
    });

    // Chi phí trực tiếp
    directExpenses.forEach(e => {
        events.push({ date: e.date || e.createdAt, type: 'actual', amount: Number(e.amount) || 0, label: 'Chi phí' });
    });

    // Chi phí phân bổ
    allocatedExpenses.forEach(a => {
        events.push({ date: a.createdAt, type: 'actual', amount: Number(a.amount) || 0, label: 'Chi phí phân bổ' });
    });

    // Contractor payments
    contractorPayments.forEach(cp => {
        if (['approved', 'paid'].includes(cp.status)) {
            events.push({ date: cp.createdAt, type: 'actual', amount: cp.netAmount || cp.contractAmount, label: 'Thầu phụ' });
        }
    });

    // Budget plan (spread evenly over project duration)
    const budgetTotal = project?.budgetTotal || materialPlans.reduce((s, p) => s + p.quantity * (p.budgetUnitPrice || p.unitPrice), 0);
    const startDate = project?.startDate || new Date();
    const endDate = project?.endDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
    const totalWeeks = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (7 * 24 * 60 * 60 * 1000)));

    // Sort actual events by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Group by week number
    const weekStart = new Date(startDate);
    const getWeek = (date) => Math.floor((new Date(date) - weekStart) / (7 * 24 * 60 * 60 * 1000));

    const weeklyActual = {};
    events.forEach(e => {
        const w = Math.max(0, getWeek(e.date));
        weeklyActual[w] = (weeklyActual[w] || 0) + e.amount;
    });

    // Build cumulative data points
    const maxWeek = Math.max(totalWeeks, ...Object.keys(weeklyActual).map(Number), 1);
    const dataPoints = [];
    let cumBudget = 0;
    let cumActual = 0;
    const weeklyBudget = budgetTotal / totalWeeks;

    for (let w = 0; w <= maxWeek; w++) {
        cumBudget = Math.min(cumBudget + weeklyBudget, budgetTotal);
        cumActual += weeklyActual[w] || 0;

        const weekDate = new Date(weekStart);
        weekDate.setDate(weekDate.getDate() + w * 7);

        dataPoints.push({
            week: w,
            date: weekDate.toISOString(),
            label: `T${w + 1}`,
            budget: Math.round(cumBudget),
            actual: Math.round(cumActual),
        });
    }

    return NextResponse.json({
        dataPoints,
        summary: {
            budgetTotal: Math.round(budgetTotal),
            actualTotal: Math.round(cumActual),
            variance: Math.round(cumActual - budgetTotal),
            totalWeeks: maxWeek + 1,
            projectStart: startDate,
            projectEnd: endDate,
        },
    });
}, { roles: ['giam_doc', 'ke_toan'] });
