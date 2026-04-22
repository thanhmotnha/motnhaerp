import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generateCode } from '@/lib/generateCode';
import { debtPaymentSchema } from '@/lib/validations/debt';
import { createServiceExpenseFromPayment } from '@/lib/serviceDebtExpense';
import { notifyServiceDebtPayment } from '@/lib/zaloNotify';

export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json();
    const data = debtPaymentSchema.parse(body);

    const debt = await prisma.contractorDebt.findUnique({
        where: { id },
        include: { contractor: { select: { id: true, name: true } } },
    });
    if (!debt) return NextResponse.json({ error: 'Không tìm thấy công nợ' }, { status: 404 });

    const remaining = debt.totalAmount - debt.paidAmount;
    if (data.amount > remaining) {
        return NextResponse.json({ error: `Số tiền vượt quá còn nợ (${remaining.toLocaleString('vi-VN')}đ)` }, { status: 400 });
    }

    const [code, logCode] = await Promise.all([
        generateCode('contractorDebtPayment', 'TTTH'),
        generateCode('contractorPaymentLog', 'CP'),
    ]);

    const payment = await prisma.$transaction(async (tx) => {
        const current = await tx.contractorDebt.findUnique({
            where: { id },
            select: { totalAmount: true, paidAmount: true },
        });
        const newPaid = current.paidAmount + data.amount;
        const newStatus = newPaid >= current.totalAmount ? 'paid' : 'partial';

        const [p] = await Promise.all([
            tx.contractorDebtPayment.create({
                data: { code, debtId: id, ...data, createdById: session.user.id },
            }),
            tx.contractorDebt.update({
                where: { id },
                data: { paidAmount: newPaid, status: newStatus },
            }),
            // Đồng bộ sổ cái: tạo ContractorPaymentLog để /api/debt/contractors phản ánh khoản trả này
            tx.contractorPaymentLog.create({
                data: {
                    code: logCode,
                    contractorId: debt.contractorId,
                    amount: data.amount,
                    date: data.date ? new Date(data.date) : new Date(),
                    notes: data.notes ?? '',
                    createdById: session.user.id,
                },
            }),
        ]);

        // Service debt (cash-basis): tự sinh ProjectExpense + allocations pro-rata
        if (debt.allocationPlan) {
            const expense = await createServiceExpenseFromPayment(
                tx,
                {
                    ...debt,
                    recipientType: 'Thầu phụ',
                    recipientId: debt.contractorId,
                    recipientName: debt.contractor?.name || '',
                },
                data.amount,
                session.user.id,
                data.date,
            );
            if (expense) {
                await tx.contractorDebtPayment.update({
                    where: { id: p.id },
                    data: { expenseId: expense.id },
                });
            }
        } else if (debt.expenseId) {
            // Debt thường (accrual): sync expense đã tồn tại
            const expense = await tx.projectExpense.findUnique({
                where: { id: debt.expenseId },
                select: { status: true, paidAmount: true, amount: true, deletedAt: true },
            });
            if (expense && !expense.deletedAt && expense.status !== 'Hoàn thành') {
                const newExpensePaid = (expense.paidAmount || 0) + data.amount;
                const newExpenseStatus = newExpensePaid >= expense.amount ? 'Đã chi' : expense.status;
                await tx.projectExpense.update({
                    where: { id: debt.expenseId },
                    data: { paidAmount: newExpensePaid, status: newExpenseStatus },
                });
            }
        }

        return p;
    });

    // Fire-and-forget Zalo notify cho service debt (có allocationPlan)
    if (debt.allocationPlan && payment?.expenseId) {
        (async () => {
            try {
                const exp = await prisma.projectExpense.findUnique({
                    where: { id: payment.expenseId },
                    include: { allocations: { include: { project: { select: { name: true } } } } },
                });
                if (exp) {
                    const projectAllocations = exp.allocations.map(a => ({
                        projectName: a.project?.name || a.projectId,
                        amount: a.amount,
                        ratio: a.ratio,
                    }));
                    const currentAfter = await prisma.contractorDebt.findUnique({
                        where: { id },
                        select: { totalAmount: true, paidAmount: true },
                    });
                    const remainingAfter = (currentAfter?.totalAmount || 0) - (currentAfter?.paidAmount || 0);
                    await notifyServiceDebtPayment({
                        debtCode: debt.code,
                        recipientName: debt.contractor?.name || '',
                        serviceCategory: debt.serviceCategory,
                        amountPaid: data.amount,
                        remaining: remainingAfter,
                        projectAllocations,
                    });
                }
            } catch {}
        })().catch(() => {});
    }

    return NextResponse.json(payment, { status: 201 });
}, { roles: ['giam_doc', 'ke_toan'] });
