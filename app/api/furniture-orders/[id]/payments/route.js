import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_req, { params }) => {
    const { id } = await params;
    const payments = await prisma.furniturePayment.findMany({
        where: { furnitureOrderId: id },
        orderBy: { paidAt: 'desc' },
    });
    return NextResponse.json(payments);
});

export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    if (!body.amount || !body.type) {
        return NextResponse.json({ error: 'Thiếu amount hoặc type' }, { status: 400 });
    }

    const payment = await prisma.furniturePayment.create({
        data: {
            furnitureOrderId: id,
            amount: body.amount,
            type: body.type, // deposit | installment | final | refund
            method: body.method || '',
            reference: body.reference || '',
            note: body.note || '',
            paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
            createdBy: request.user?.name || '',
        },
    });

    // Recalc paidAmount & depositAmount trên FurnitureOrder
    const allPayments = await prisma.furniturePayment.findMany({
        where: { furnitureOrderId: id },
        select: { amount: true, type: true },
    });
    const depositAmount = allPayments.filter(p => p.type === 'deposit').reduce((s, p) => s + p.amount, 0);
    const paidAmount = allPayments.filter(p => p.type !== 'refund').reduce((s, p) => s + p.amount, 0)
        - allPayments.filter(p => p.type === 'refund').reduce((s, p) => s + p.amount, 0);

    await prisma.furnitureOrder.update({
        where: { id },
        data: { depositAmount, paidAmount },
    });

    return NextResponse.json(payment, { status: 201 });
});
