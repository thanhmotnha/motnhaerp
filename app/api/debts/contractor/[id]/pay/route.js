import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generateCode } from '@/lib/generateCode';
import { debtPaymentSchema } from '@/lib/validations/debt';

export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json();
    const data = debtPaymentSchema.parse(body);

    const debt = await prisma.contractorDebt.findUnique({
        where: { id },
        select: { id: true, totalAmount: true, paidAmount: true },
    });
    if (!debt) return NextResponse.json({ error: 'Không tìm thấy công nợ' }, { status: 404 });

    const remaining = debt.totalAmount - debt.paidAmount;
    if (data.amount > remaining) {
        return NextResponse.json({ error: `Số tiền vượt quá còn nợ (${remaining.toLocaleString('vi-VN')}đ)` }, { status: 400 });
    }

    const newPaid = debt.paidAmount + data.amount;
    const newStatus = newPaid >= debt.totalAmount ? 'paid' : 'partial';
    const code = await generateCode('contractorDebtPayment', 'TTTH');

    const [payment] = await prisma.$transaction([
        prisma.contractorDebtPayment.create({
            data: { code, debtId: id, ...data, createdById: session.user.id },
        }),
        prisma.contractorDebt.update({
            where: { id },
            data: { paidAmount: newPaid, status: newStatus },
        }),
    ]);

    return NextResponse.json(payment, { status: 201 });
});
