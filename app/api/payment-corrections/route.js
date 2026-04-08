import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { correctionCreateSchema } from '@/lib/validations/paymentCorrection';

const FINANCE_ROLES = ['giam_doc', 'ke_toan'];

export const GET = withAuth(async (request, _ctx, session) => {
    if (!FINANCE_ROLES.includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where = {};
    if (status) where.status = status;

    const corrections = await prisma.paymentCorrection.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            contractPayment: {
                select: {
                    phase: true,
                    amount: true,
                    contract: {
                        select: { id: true, code: true, name: true },
                    },
                },
            },
        },
    });

    return NextResponse.json(corrections);
});

export const POST = withAuth(async (request, _ctx, session) => {
    if (!FINANCE_ROLES.includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validated = correctionCreateSchema.parse(body);

    // Check không có pending correction khác cho cùng contractPaymentId
    const existing = await prisma.paymentCorrection.findFirst({
        where: { contractPaymentId: validated.contractPaymentId, status: 'pending' },
    });
    if (existing) {
        return NextResponse.json(
            { error: 'Đã có yêu cầu đính chính đang chờ duyệt cho đợt này' },
            { status: 409 }
        );
    }

    // Lấy oldAmount từ ContractPayment hiện tại
    const payment = await prisma.contractPayment.findUnique({
        where: { id: validated.contractPaymentId },
        select: { paidAmount: true },
    });
    if (!payment) {
        return NextResponse.json({ error: 'Không tìm thấy đợt thanh toán' }, { status: 404 });
    }

    const correction = await prisma.paymentCorrection.create({
        data: {
            contractPaymentId: validated.contractPaymentId,
            contractId: validated.contractId,
            oldAmount: payment.paidAmount,
            newAmount: validated.newAmount,
            reason: validated.reason,
            requestedBy: session.user.id,
        },
    });

    // Tạo notification cho GĐ/Phó GĐ
    await prisma.notification.create({
        data: {
            type: 'warning',
            icon: '✏️',
            title: 'Yêu cầu đính chính thanh toán',
            message: `${session.user.name} yêu cầu đính chính số tiền đã thu`,
            link: '/finance?tab=thu_tien',
            source: 'payment_correction',
        },
    });

    return NextResponse.json(correction, { status: 201 });
});
