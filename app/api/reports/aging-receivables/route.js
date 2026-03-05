import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

function agingBucket(dueDate) {
    if (!dueDate) return 'current';
    const days = Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000);
    if (days < 0) return 'current';
    if (days <= 30) return '1-30';
    if (days <= 60) return '31-60';
    if (days <= 90) return '61-90';
    return '>90';
}

export const GET = withAuth(async () => {
    const payments = await prisma.contractPayment.findMany({
        where: {
            status: { not: 'Đã thu' },
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
                    id: true,
                    code: true,
                    name: true,
                    project: { select: { id: true, code: true, name: true } },
                    customer: { select: { id: true, name: true } },
                },
            },
        },
        orderBy: { dueDate: 'asc' },
    });

    const rows = payments
        .map(p => {
            const outstanding = (p.amount || 0) - (p.paidAmount || 0);
            if (outstanding <= 0) return null;
            const daysOverdue = p.dueDate
                ? Math.max(0, Math.floor((Date.now() - new Date(p.dueDate).getTime()) / 86400000))
                : null;
            return {
                id: p.id,
                phase: p.phase,
                outstanding,
                dueDate: p.dueDate,
                daysOverdue,
                bucket: agingBucket(p.dueDate),
                status: p.status,
                contractId: p.contract?.id,
                contractCode: p.contract?.code,
                projectName: p.contract?.project?.name || '',
                projectId: p.contract?.project?.id,
                customerName: p.contract?.customer?.name || '',
            };
        })
        .filter(Boolean);

    const BUCKETS = ['current', '1-30', '31-60', '61-90', '>90'];
    const bucketTotals = Object.fromEntries(BUCKETS.map(b => [b, rows.filter(r => r.bucket === b).reduce((s, r) => s + r.outstanding, 0)]));
    const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0);

    return NextResponse.json({ rows, bucketTotals, totalOutstanding, BUCKETS });
});
