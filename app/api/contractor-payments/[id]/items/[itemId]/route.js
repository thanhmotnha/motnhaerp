import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const DELETE = withAuth(async (request, { params }) => {
    const { id, itemId } = await params;
    await prisma.contractorPaymentItem.delete({ where: { id: itemId } });

    // Recalculate contractAmount
    const agg = await prisma.contractorPaymentItem.aggregate({
        where: { contractorPaymentId: id },
        _sum: { amount: true },
    });
    await prisma.contractorPayment.update({
        where: { id },
        data: { contractAmount: agg._sum.amount || 0 },
    });

    return NextResponse.json({ success: true });
});
