import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Update a single payment phase
export const PUT = withAuth(async (request, { params }) => {
    const { id, paymentId } = await params;
    const data = await request.json();

    const updateData = {};
    if (data.paidAmount !== undefined) updateData.paidAmount = Number(data.paidAmount) || 0;
    if (data.status) updateData.status = data.status;
    if (data.proofUrl !== undefined) updateData.proofUrl = data.proofUrl;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.paidDate !== undefined) updateData.paidDate = data.paidDate ? new Date(data.paidDate) : null;
    if (data.paymentAccount !== undefined) updateData.paymentAccount = data.paymentAccount;

    const updated = await prisma.$transaction(async (tx) => {
        // If proofUrl is uploaded, auto-mark as paid with full amount
        if (data.proofUrl && !updateData.status) {
            const payment = await tx.contractPayment.findUnique({ where: { id: paymentId } });
            if (payment) {
                updateData.paidAmount = payment.amount;
                updateData.status = 'Đã thu';
                updateData.paidDate = new Date();
            }
        }

        const result = await tx.contractPayment.update({
            where: { id: paymentId },
            data: updateData,
        });

        // Recalc contract paidAmount atomically
        const total = await tx.contractPayment.aggregate({
            where: { contractId: id },
            _sum: { paidAmount: true },
        });
        await tx.contract.update({
            where: { id },
            data: { paidAmount: total._sum.paidAmount || 0 },
        });

        return result;
    });

    return NextResponse.json(updated);
});
