import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/reports/payment-reminders — Đợt thanh toán sắp/quá hạn
export const GET = withAuth(async (request, context, session) => {
    const now = new Date();
    const in7days = new Date(now); in7days.setDate(in7days.getDate() + 7);
    const in30days = new Date(now); in30days.setDate(in30days.getDate() + 30);

    // Contract payments chưa thu
    const unpaidPayments = await prisma.contractPayment.findMany({
        where: {
            status: { notIn: ['Đã thu', 'Đã thanh toán'] },
            dueDate: { lte: in30days },
        },
        select: {
            id: true,
            phase: true,
            amount: true,
            paidAmount: true,
            dueDate: true,
            status: true,
            contract: {
                select: {
                    code: true,
                    name: true,
                    customer: { select: { name: true, phone: true, email: true } },
                    project: { select: { code: true, name: true } },
                },
            },
        },
        orderBy: { dueDate: 'asc' },
    });

    const overdue = [];
    const dueSoon = [];
    const upcoming = [];

    for (const p of unpaidPayments) {
        const remaining = (p.amount || 0) - (p.paidAmount || 0);
        const daysUntilDue = Math.floor((new Date(p.dueDate) - now) / 86400000);
        const item = {
            id: p.id,
            phase: p.phase,
            amount: p.amount,
            remaining,
            dueDate: p.dueDate,
            daysUntilDue,
            contract: p.contract?.code,
            contractName: p.contract?.name,
            customer: p.contract?.customer?.name,
            customerPhone: p.contract?.customer?.phone,
            customerEmail: p.contract?.customer?.email,
            project: p.contract?.project?.name,
            projectCode: p.contract?.project?.code,
        };

        if (daysUntilDue < 0) {
            overdue.push(item);
        } else if (daysUntilDue <= 7) {
            dueSoon.push(item);
        } else {
            upcoming.push(item);
        }
    }

    return NextResponse.json({
        overdue,
        dueSoon,
        upcoming,
        summary: {
            overdueCount: overdue.length,
            overdueAmount: overdue.reduce((s, x) => s + x.remaining, 0),
            dueSoonCount: dueSoon.length,
            dueSoonAmount: dueSoon.reduce((s, x) => s + x.remaining, 0),
            upcomingCount: upcoming.length,
            upcomingAmount: upcoming.reduce((s, x) => s + x.remaining, 0),
        },
    });
}, { roles: ['giam_doc', 'pho_gd', 'ke_toan'] });
