import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/activityLog';
import { generateCode } from '@/lib/generateCode';

// POST record a payment
export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json();
    const { amount, type, method, reference, note, paidAt } = body;

    if (!amount || amount <= 0) return NextResponse.json({ error: 'Số tiền không hợp lệ' }, { status: 400 });

    const order = await prisma.furnitureOrder.findUniqueOrThrow({
        where: { id },
        select: { id: true, code: true, name: true, projectId: true },
    });

    const amountDelta = type === 'refund' ? -Math.abs(amount) : Math.abs(amount);
    const txCode = await generateCode('transaction', 'GD');
    const isRefund = type === 'refund';
    const typeLabel = { deposit: 'Đặt cọc', installment: 'Thanh toán đợt', final: 'TT cuối', refund: 'Hoàn tiền' }[type] || type;

    const [payment] = await prisma.$transaction([
        prisma.furniturePayment.create({
            data: {
                furnitureOrderId: id,
                amount: Math.abs(amount),
                type: type || 'installment',
                method: method || 'bank_transfer',
                reference: reference || '',
                note: note || '',
                paidAt: paidAt ? new Date(paidAt) : new Date(),
                createdBy: session?.user?.name || '',
            },
        }),
        prisma.furnitureOrder.update({
            where: { id },
            data: {
                paidAmount: { increment: amountDelta },
                ...(type === 'deposit' ? { depositAmount: { increment: Math.abs(amount) } } : {}),
            },
        }),
        // Auto-create Transaction for Finance module
        prisma.transaction.create({
            data: {
                code: txCode,
                type: isRefund ? 'Chi' : 'Thu',
                description: `[NT] ${order.code} — ${typeLabel} — ${order.name}`,
                amount: Math.abs(amount),
                category: 'Nội thất May Đo',
                date: paidAt ? new Date(paidAt) : new Date(),
                projectId: order.projectId || null,
            },
        }),
    ]);

    logActivity({
        actor: session?.user?.name || '',
        action: 'CREATE',
        entityType: 'FurniturePayment',
        entityId: payment.id,
        entityLabel: `${order.code} — ${amount.toLocaleString('vi-VN')}đ (${type})`,
    });

    return NextResponse.json(payment, { status: 201 });
}, { roles: ['giam_doc', 'pho_gd', 'ke_toan'] });

// GET all payments for an order
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const payments = await prisma.furniturePayment.findMany({
        where: { furnitureOrderId: id },
        orderBy: { paidAt: 'desc' },
    });
    return NextResponse.json(payments);
});
