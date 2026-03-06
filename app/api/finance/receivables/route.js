import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// List all payment phases from all active contracts (for finance receivables)
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const where = {
        contract: { deletedAt: null },
    };
    if (projectId) where.contract.projectId = projectId;

    const payments = await prisma.contractPayment.findMany({
        where,
        include: {
            contract: {
                select: {
                    id: true, code: true, name: true, type: true, contractValue: true,
                    deletedAt: true,
                    customer: { select: { id: true, name: true } },
                    project: { select: { id: true, name: true, code: true } },
                },
            },
        },
        orderBy: { createdAt: 'asc' },
    });

    // Filter out soft-deleted contracts (double safety)
    const activePayments = payments.filter(p => !p.contract?.deletedAt);

    const totalReceivable = activePayments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalReceived = activePayments.reduce((s, p) => s + (p.paidAmount || 0), 0);
    const outstanding = totalReceivable - totalReceived;

    return NextResponse.json({
        payments: activePayments,
        summary: { totalReceivable, totalReceived, outstanding },
    });
});
