import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET — payment alerts: ContractPayments due within next 7 days that are not paid
export const GET = withAuth(async (request) => {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const overduePayments = await prisma.contractPayment.findMany({
        where: {
            status: { not: 'Đã thu' },
            dueDate: { lte: sevenDaysLater },
        },
        include: {
            contract: {
                select: {
                    id: true,
                    code: true,
                    name: true,
                    customer: { select: { id: true, name: true, code: true } },
                    project: { select: { id: true, name: true, code: true } },
                },
            },
        },
        orderBy: { dueDate: 'asc' },
    });

    // Classify
    const overdue = overduePayments.filter(p => p.dueDate && p.dueDate < now);
    const upcoming = overduePayments.filter(p => p.dueDate && p.dueDate >= now);

    return NextResponse.json({
        overdue,
        upcoming,
        totalOverdue: overdue.reduce((s, p) => s + (p.amount - p.paidAmount), 0),
        totalUpcoming: upcoming.reduce((s, p) => s + (p.amount - p.paidAmount), 0),
        count: overduePayments.length,
    });
});
