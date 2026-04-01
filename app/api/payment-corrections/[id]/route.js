import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { correctionReviewSchema } from '@/lib/validations/paymentCorrection';

const REVIEW_ROLES = ['giam_doc', 'pho_gd'];

export const PUT = withAuth(async (request, { params }, session) => {
    if (!REVIEW_ROLES.includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, rejectionNote } = correctionReviewSchema.parse(body);

    const correction = await prisma.paymentCorrection.findUnique({
        where: { id },
        select: { id: true, status: true, contractPaymentId: true, contractId: true, newAmount: true, requestedBy: true },
    });
    if (!correction) {
        return NextResponse.json({ error: 'Không tìm thấy yêu cầu đính chính' }, { status: 404 });
    }
    if (correction.status !== 'pending') {
        return NextResponse.json({ error: 'Yêu cầu đã được xử lý' }, { status: 400 });
    }

    if (action === 'approved') {
        // Lấy ContractPayment để xác định status mới
        const cp = await prisma.contractPayment.findUnique({
            where: { id: correction.contractPaymentId },
            select: { amount: true },
        });

        const newPaid = correction.newAmount;
        const newStatus = newPaid <= 0 ? 'Chưa thu'
            : newPaid >= (cp?.amount || 0) ? 'Đã thu'
            : 'Thu một phần';

        await prisma.$transaction(async (tx) => {
            // Cập nhật ContractPayment
            await tx.contractPayment.update({
                where: { id: correction.contractPaymentId },
                data: { paidAmount: newPaid, status: newStatus },
            });

            // Recalc Contract.paidAmount
            const total = await tx.contractPayment.aggregate({
                where: { contractId: correction.contractId },
                _sum: { paidAmount: true },
            });
            await tx.contract.update({
                where: { id: correction.contractId },
                data: { paidAmount: total._sum.paidAmount || 0 },
            });

            // Cập nhật correction
            await tx.paymentCorrection.update({
                where: { id },
                data: { status: 'approved', reviewedBy: session.user.id, reviewedAt: new Date() },
            });
        });

        // Notification cho người tạo yêu cầu
        await prisma.notification.create({
            data: {
                type: 'success',
                icon: '✅',
                title: 'Yêu cầu đính chính được duyệt',
                message: `Số tiền đã được cập nhật thành công`,
                link: '/finance?tab=thu_tien',
                source: 'payment_correction',
            },
        });
    } else {
        // rejected
        await prisma.paymentCorrection.update({
            where: { id },
            data: {
                status: 'rejected',
                rejectionNote: rejectionNote || '',
                reviewedBy: session.user.id,
                reviewedAt: new Date(),
            },
        });

        await prisma.notification.create({
            data: {
                type: 'danger',
                icon: '❌',
                title: 'Yêu cầu đính chính bị từ chối',
                message: rejectionNote ? `Lý do: ${rejectionNote}` : 'Yêu cầu đính chính bị từ chối',
                link: '/finance?tab=thu_tien',
                source: 'payment_correction',
            },
        });
    }

    return NextResponse.json({ ok: true });
});
