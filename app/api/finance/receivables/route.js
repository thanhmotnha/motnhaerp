import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// List all payment phases from all contracts (for finance receivables tab)
export const GET = withAuth(async (request) => {
    const payments = await prisma.contractPayment.findMany({
        include: {
            contract: {
                select: {
                    id: true, code: true, name: true, type: true, contractValue: true,
                    customer: { select: { id: true, name: true } },
                    project: { select: { id: true, name: true } },
                },
            },
        },
        orderBy: { createdAt: 'asc' },
    });

    // Summary
    const totalReceivable = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalReceived = payments.reduce((s, p) => s + (p.paidAmount || 0), 0);
    const outstanding = totalReceivable - totalReceived;

    return NextResponse.json({
        payments,
        summary: { totalReceivable, totalReceived, outstanding },
    });
});
