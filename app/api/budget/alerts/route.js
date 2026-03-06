import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * Budget Alert API — server-side calculation.
 * Compares actual spending (PO + Contractor + Expenses) vs locked budget.
 * Returns alert data if overspend detected.
 */
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
            budgetTotal: true,
            budgetStatus: true,
            budgetLockedAt: true,
        },
    });
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Only alert if budget is locked
    if (project.budgetStatus !== 'Đã khóa') {
        return NextResponse.json({ hasAlert: false, reason: 'Budget not locked' });
    }

    const lockedBudget = project.budgetTotal || 0;
    if (lockedBudget <= 0) {
        return NextResponse.json({ hasAlert: false, reason: 'No budget set' });
    }

    // Actual costs — server-side aggregation
    const [materialResult, contractorResult, expenseResult] = await Promise.all([
        prisma.purchaseOrder.aggregate({
            where: { projectId, status: { not: 'Đã hủy' } },
            _sum: { totalAmount: true },
        }),
        prisma.contractorPayment.aggregate({
            where: { projectId },
            _sum: { contractAmount: true },
        }),
        prisma.expense.aggregate({
            where: { projectId },
            _sum: { amount: true },
        }),
    ]);

    const materialCost = materialResult._sum.totalAmount || 0;
    const contractorCost = contractorResult._sum.contractAmount || 0;
    const expenseCost = expenseResult._sum.amount || 0;
    const totalActual = materialCost + contractorCost + expenseCost;

    const overspend = totalActual - lockedBudget;
    const overshootPct = lockedBudget > 0 ? ((overspend / lockedBudget) * 100).toFixed(1) : 0;

    return NextResponse.json({
        hasAlert: overspend > 0,
        lockedBudget,
        totalActual,
        overspend: Math.max(0, overspend),
        overshootPct: overspend > 0 ? Number(overshootPct) : 0,
        breakdown: {
            material: materialCost,
            contractor: contractorCost,
            expense: expenseCost,
        },
        budgetLockedAt: project.budgetLockedAt,
    });
});
