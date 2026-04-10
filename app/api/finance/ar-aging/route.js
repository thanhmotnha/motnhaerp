import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/finance/ar-aging
// Returns accounts receivable aging report grouped by age brackets
export const GET = withAuth(async (request) => {
    const today = new Date();

    // Fetch all unpaid/partially-paid contract payments
    const payments = await prisma.contractPayment.findMany({
        where: {
            status: { in: ['Chưa thu', 'Thu một phần'] },
        },
        include: {
            contract: {
                select: {
                    code: true, name: true,
                    customer: { select: { name: true } },
                    project: { select: { name: true, code: true } },
                },
            },
        },
        orderBy: { dueDate: 'asc' },
    });

    const brackets = {
        current: { label: 'Chưa đến hạn', min: null, max: 0, items: [], total: 0 },
        '0_30': { label: '1–30 ngày', min: 1, max: 30, items: [], total: 0 },
        '31_60': { label: '31–60 ngày', min: 31, max: 60, items: [], total: 0 },
        '61_90': { label: '61–90 ngày', min: 61, max: 90, items: [], total: 0 },
        '90plus': { label: '> 90 ngày', min: 91, max: null, items: [], total: 0 },
        no_due_date: { label: 'Chưa có hạn', min: null, max: null, items: [], total: 0 },
    };

    for (const p of payments) {
        const outstanding = (p.amount || 0) - (p.paidAmount || 0);
        if (outstanding <= 0) continue;

        const item = {
            id: p.id,
            phase: p.phase,
            amount: p.amount,
            paidAmount: p.paidAmount || 0,
            outstanding,
            dueDate: p.dueDate,
            status: p.status,
            contractCode: p.contract?.code,
            contractName: p.contract?.name,
            customerName: p.contract?.customer?.name,
            projectName: p.contract?.project?.name,
            projectCode: p.contract?.project?.code,
        };

        if (!p.dueDate) {
            brackets.no_due_date.items.push(item);
            brackets.no_due_date.total += outstanding;
            continue;
        }

        const dueDate = new Date(p.dueDate);
        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

        if (daysOverdue <= 0) {
            brackets.current.items.push({ ...item, daysOverdue });
            brackets.current.total += outstanding;
        } else if (daysOverdue <= 30) {
            brackets['0_30'].items.push({ ...item, daysOverdue });
            brackets['0_30'].total += outstanding;
        } else if (daysOverdue <= 60) {
            brackets['31_60'].items.push({ ...item, daysOverdue });
            brackets['31_60'].total += outstanding;
        } else if (daysOverdue <= 90) {
            brackets['61_90'].items.push({ ...item, daysOverdue });
            brackets['61_90'].total += outstanding;
        } else {
            brackets['90plus'].items.push({ ...item, daysOverdue });
            brackets['90plus'].total += outstanding;
        }
    }

    const grandTotal = Object.values(brackets).reduce((s, b) => s + b.total, 0);

    return NextResponse.json({ brackets, grandTotal, asOf: today });
}, { roles: ['giam_doc', 'ke_toan'] });
