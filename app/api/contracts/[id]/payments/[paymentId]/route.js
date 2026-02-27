import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Update a single payment phase
export async function PUT(request, { params }) {
    const { id, paymentId } = await params;
    const data = await request.json();

    const updateData = {};
    if (data.paidAmount !== undefined) updateData.paidAmount = Number(data.paidAmount) || 0;
    if (data.status) updateData.status = data.status;
    if (data.proofUrl !== undefined) updateData.proofUrl = data.proofUrl;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.paidDate !== undefined) updateData.paidDate = data.paidDate ? new Date(data.paidDate) : null;

    // If proofUrl is uploaded, auto-mark as paid with full amount
    if (data.proofUrl && !updateData.status) {
        const payment = await prisma.contractPayment.findUnique({ where: { id: paymentId } });
        if (payment) {
            updateData.paidAmount = payment.amount;
            updateData.status = 'Đã thu';
            updateData.paidDate = new Date();
        }
    }

    const updated = await prisma.contractPayment.update({
        where: { id: paymentId },
        data: updateData,
    });

    // Recalc contract paidAmount
    const total = await prisma.contractPayment.aggregate({
        where: { contractId: id },
        _sum: { paidAmount: true },
    });
    await prisma.contract.update({
        where: { id },
        data: { paidAmount: total._sum.paidAmount || 0 },
    });

    return NextResponse.json(updated);
}
