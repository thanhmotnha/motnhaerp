import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generateCode } from '@/lib/generateCode';
import { debtPaymentSchema } from '@/lib/validations/debt';
import { createServiceExpenseFromPayment } from '@/lib/serviceDebtExpense';
import { notifyServiceDebtPayment } from '@/lib/zaloNotify';

const RACE_ERROR = 'DEBT_RACE_CONDITION';

export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json();
    const data = debtPaymentSchema.parse(body);

    const debt = await prisma.supplierDebt.findUnique({
        where: { id },
        include: { supplier: { select: { id: true, name: true } } },
    });
    if (!debt) return NextResponse.json({ error: 'Không tìm thấy công nợ' }, { status: 404 });

    const remaining = debt.totalAmount - debt.paidAmount;
    if (data.amount > remaining) {
        return NextResponse.json({ error: `Số tiền vượt quá còn nợ (${remaining.toLocaleString('vi-VN')}đ)` }, { status: 400 });
    }

    const [code, spCode] = await Promise.all([
        generateCode('supplierDebtPayment', 'TTNCC'),
        generateCode('supplierPayment', 'SP'),
    ]);

    let payment;
    try {
        payment = await prisma.$transaction(async (tx) => {
            const current = await tx.supplierDebt.findUnique({
                where: { id },
                select: { totalAmount: true, paidAmount: true },
            });
            if (!current) {
                throw new Error('DEBT_DELETED');
            }
            const newPaid = current.paidAmount + data.amount;
            const newStatus = newPaid >= current.totalAmount ? 'paid' : 'partial';

            // Tuần tự để đảm bảo thứ tự + optimistic lock hoạt động đúng
            const p = await tx.supplierDebtPayment.create({
                data: { code, debtId: id, ...data, createdById: session.user.id },
            });

            // Optimistic lock: chỉ update nếu paidAmount chưa thay đổi
            const updated = await tx.supplierDebt.updateMany({
                where: { id, paidAmount: current.paidAmount },
                data: { paidAmount: newPaid, status: newStatus },
            });
            if (updated.count === 0) {
                throw new Error(RACE_ERROR);
            }

            // Đồng bộ sổ cái: tạo SupplierPayment để /api/debt/ncc phản ánh khoản trả này
            const ledger = await tx.supplierPayment.create({
                data: {
                    code: spCode,
                    supplierId: debt.supplierId,
                    amount: data.amount,
                    date: data.date ? new Date(data.date) : new Date(),
                    notes: data.notes ?? '',
                    paymentAccount: data.paymentAccount || '',
                    createdById: session.user.id,
                },
            });

            // Service debt (cash-basis): tự sinh ProjectExpense + allocations pro-rata
            if (debt.allocationPlan) {
                const expense = await createServiceExpenseFromPayment(
                    tx,
                    {
                        ...debt,
                        recipientType: 'NCC',
                        recipientId: debt.supplierId,
                        recipientName: debt.supplier?.name || '',
                    },
                    data.amount,
                    session.user.id,
                    data.date,
                );
                if (expense) {
                    await tx.supplierDebtPayment.update({
                        where: { id: p.id },
                        data: { expenseId: expense.id },
                    });
                    await tx.supplierPayment.update({
                        where: { id: ledger.id },
                        data: { expenseId: expense.id },
                    });
                    return { ...p, expenseId: expense.id };
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
    } catch (err) {
        if (err?.message === RACE_ERROR) {
            return NextResponse.json(
                { error: 'Công nợ vừa được cập nhật bởi người khác, vui lòng thử lại' },
                { status: 409 },
            );
        }
        if (err?.message === 'DEBT_DELETED') {
            return NextResponse.json(
                { error: 'Công nợ đã bị xóa trong lúc bạn thao tác' },
                { status: 409 },
            );
        }
        throw err;
    }

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
                    const currentAfter = await prisma.supplierDebt.findUnique({
                        where: { id },
                        select: { totalAmount: true, paidAmount: true },
                    });
                    const remainingAfter = (currentAfter?.totalAmount || 0) - (currentAfter?.paidAmount || 0);
                    await notifyServiceDebtPayment({
                        debtCode: debt.code,
                        recipientName: debt.supplier?.name || '',
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
