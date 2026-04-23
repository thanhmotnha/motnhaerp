import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { generateCode, withCodeRetry } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { expenseCreateSchema, expenseUpdateSchema } from '@/lib/validations/expense';
import { notifyPendingApproval } from '@/lib/zaloNotify';
import { logActivity } from '@/lib/activityLogger';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const status = searchParams.get('status');
    const expenseType = searchParams.get('expenseType');
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');
    const projectId = searchParams.get('projectId');

    const where = {};
    if (status) where.status = status;
    if (expenseType) where.expenseType = expenseType;
    if (categoryId) where.categoryId = categoryId;
    if (projectId) {
        // Tìm cả expense trực tiếp + expense có allocation vào project
        where.OR = [
            { projectId },
            { allocations: { some: { projectId } } },
        ];
    }
    if (search) where.description = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
        prisma.projectExpense.findMany({
            where,
            include: {
                project: { select: { name: true, code: true } },
                expenseCategory: { select: { id: true, name: true, code: true, linkType: true } },
                allocations: {
                    include: { project: { select: { id: true, name: true, code: true } } },
                },
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        }),
        prisma.projectExpense.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(data, total, { page, limit }));
});

export const POST = withAuth(async (request, context, session) => {
    const body = await request.json();
    const { allocations, ...data } = expenseCreateSchema.parse(body);
    const code = await generateCode('projectExpense', 'CP');

    const expense = await prisma.$transaction(async (tx) => {
        const exp = await tx.projectExpense.create({
            data: { code, ...data },
        });

        // Tạo allocations nếu có
        if (allocations && allocations.length > 0) {
            await tx.expenseAllocation.createMany({
                data: allocations.map(a => ({
                    expenseId: exp.id,
                    projectId: a.projectId,
                    amount: a.amount || 0,
                    ratio: a.ratio || 0,
                    notes: a.notes || '',
                })),
            });
        }

        return tx.projectExpense.findFirst({
            where: { id: exp.id },
            include: {
                expenseCategory: { select: { id: true, name: true, code: true } },
                allocations: { include: { project: { select: { id: true, name: true, code: true } } } },
            },
        });
    });

    // Auto-tạo Debt nếu expense là công nợ NCC/Thầu phụ
    const SKIP_AUTO_DEBT_TYPES = new Set(['Xuất kho', 'Nội bộ']);
    if (
        expense.recipientType &&
        expense.recipientId &&
        !SKIP_AUTO_DEBT_TYPES.has(expense.expenseType) &&
        (expense.recipientType === 'NCC' || expense.recipientType === 'Thầu phụ')
    ) {
        try {
            if (expense.recipientType === 'NCC') {
                await withCodeRetry('supplierDebt', 'CN', (dbtCode) =>
                    prisma.supplierDebt.create({
                        data: {
                            code: dbtCode,
                            supplierId: expense.recipientId,
                            projectId: expense.projectId || null,
                            description: expense.description,
                            totalAmount: expense.amount,
                            paidAmount: 0,
                            status: 'open',
                            date: expense.date,
                            notes: expense.notes || '',
                            proofUrl: expense.proofUrl || '',
                            createdById: session.user.id,
                            expenseId: expense.id,
                        },
                    })
                );
            } else if (expense.recipientType === 'Thầu phụ' && expense.projectId) {
                await withCodeRetry('contractorDebt', 'CNT', (dbtCode) =>
                    prisma.contractorDebt.create({
                        data: {
                            code: dbtCode,
                            contractorId: expense.recipientId,
                            projectId: expense.projectId,
                            description: expense.description,
                            totalAmount: expense.amount,
                            paidAmount: 0,
                            status: 'open',
                            date: expense.date,
                            notes: expense.notes || '',
                            proofUrl: expense.proofUrl || '',
                            createdById: session.user.id,
                            expenseId: expense.id,
                        },
                    })
                );
            }
        } catch (e) {
            console.warn('Auto-create debt failed:', e.message);
        }
    }

    logActivity({
        action: 'CREATE',
        entityType: 'ProjectExpense',
        entityId: expense.id,
        entityLabel: expense.code,
        actor: session.user.name,
        actorId: session.user.id,
        metadata: {
            amount: expense.amount,
            expenseType: expense.expenseType,
            recipientType: expense.recipientType || null,
            recipientId: expense.recipientId || null,
            projectId: expense.projectId || null,
            status: expense.status,
        },
    }).catch(() => { });

    // Notify giám đốc qua Zalo OA nếu expense ở trạng thái chờ duyệt
    if (expense.status === 'Chờ duyệt' && expense.amount > 0) {
        notifyPendingApproval({
            type: 'Chi phí',
            code: expense.code,
            description: expense.description,
            amount: expense.amount,
            requestedBy: session.user.name || session.user.email,
            projectName: expense.allocations?.[0]?.project?.name,
        }).catch(() => { });
    }

    return NextResponse.json(expense, { status: 201 });
});

const FINANCE_ROLES = ['giam_doc', 'ke_toan'];
const APPROVAL_STATUSES = ['Đã duyệt', 'Từ chối', 'Đã chi', 'Hoàn thành'];

export const PUT = withAuth(async (request, context, session) => {
    const body = await request.json();
    const { id, ...raw } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // Only finance roles can approve/reject expenses
    if (raw.status && APPROVAL_STATUSES.includes(raw.status)) {
        const role = session?.user?.role;
        if (!FINANCE_ROLES.includes(role)) {
            return NextResponse.json(
                { error: 'Chỉ Giám đốc, Phó GĐ hoặc Kế toán mới có quyền duyệt chi phí' },
                { status: 403 }
            );
        }
        if (raw.status === 'Đã duyệt') {
            raw.approvedBy = session.user.name || session.user.email;
        }
    }

    const { allocations, ...updateData } = expenseUpdateSchema.parse(raw);

    const existing = await prisma.projectExpense.findUnique({
        where: { id },
        select: { recipientType: true, recipientId: true, amount: true, date: true, description: true, paymentAccount: true, proofUrl: true, status: true },
    });

    if (!existing) return NextResponse.json({ error: 'Không tìm thấy lệnh chi' }, { status: 404 });

    // Idempotent guard: nếu expense đã ở trạng thái "Đã chi" và request muốn set lại "Đã chi",
    // chỉ update metadata cơ bản — skip toàn bộ sync debt/payment để tránh double-pay.
    const isAlreadyPaidIdempotent =
        updateData.status === 'Đã chi' && existing.status === 'Đã chi';

    // Pre-check: số tiền mới không được nhỏ hơn paidAmount của debt đã liên kết.
    // Check ngoài transaction để có thể trả NextResponse 422.
    const [preLinkedSupplierDebt, preLinkedContractorDebt] = await Promise.all([
        prisma.supplierDebt.findUnique({ where: { expenseId: id }, select: { paidAmount: true } }),
        prisma.contractorDebt.findUnique({ where: { expenseId: id }, select: { paidAmount: true } }),
    ]);
    const preNewTotal = updateData.amount ?? existing.amount;
    if (preLinkedSupplierDebt && preNewTotal < preLinkedSupplierDebt.paidAmount) {
        return NextResponse.json({
            error: `Không thể giảm số tiền (${preNewTotal}) xuống dưới số đã trả (${preLinkedSupplierDebt.paidAmount})`,
        }, { status: 422 });
    }
    if (preLinkedContractorDebt && preNewTotal < preLinkedContractorDebt.paidAmount) {
        return NextResponse.json({
            error: `Không thể giảm số tiền xuống dưới số đã trả thầu phụ`,
        }, { status: 422 });
    }

    // Pre-generate codes NGOÀI transaction (generateCode dùng connection riêng, không chạy
    // trong tx được) — theo pattern withCodeRetry. Chỉ gen nếu thực sự cần, tránh tốn sequence.
    const needSupplierPayment =
        !isAlreadyPaidIdempotent &&
        updateData.status === 'Đã chi' &&
        existing.recipientType === 'NCC' &&
        !!existing.recipientId;
    const needSupplierDebtPayment =
        !isAlreadyPaidIdempotent && updateData.status === 'Đã chi' && !!preLinkedSupplierDebt;
    const needContractorDebtPayment =
        !isAlreadyPaidIdempotent && updateData.status === 'Đã chi' && !!preLinkedContractorDebt;

    const [preSupplierPaymentCode, preSupplierDebtPaymentCode, preContractorDebtPaymentCode] =
        await Promise.all([
            needSupplierPayment ? generateCode('supplierPayment', 'SP') : Promise.resolve(null),
            needSupplierDebtPayment ? generateCode('supplierDebtPayment', 'TTNCC') : Promise.resolve(null),
            needContractorDebtPayment ? generateCode('contractorDebtPayment', 'TTTP') : Promise.resolve(null),
        ]);

    const expense = await prisma.$transaction(async (tx) => {
        // 1. Allocations sync
        if (allocations !== undefined) {
            await tx.expenseAllocation.deleteMany({ where: { expenseId: id } });
            if (allocations.length > 0) {
                await tx.expenseAllocation.createMany({
                    data: allocations.map(a => ({
                        expenseId: id,
                        projectId: a.projectId,
                        amount: a.amount || 0,
                        ratio: a.ratio || 0,
                        notes: a.notes || '',
                    })),
                });
            }
        } else if (updateData.amount !== undefined && updateData.amount !== existing.amount) {
            // Amount đổi nhưng user không re-config allocations → auto-scale theo tỷ lệ
            const oldAllocs = await tx.expenseAllocation.findMany({ where: { expenseId: id } });
            if (oldAllocs.length > 0) {
                const sumOld = oldAllocs.reduce((s, a) => s + (a.amount || 0), 0);
                if (sumOld > 0 && Math.abs(sumOld - existing.amount) < 1) {
                    // Sum allocations khớp với amount cũ → scale proportional
                    const ratio = updateData.amount / existing.amount;
                    for (const a of oldAllocs) {
                        await tx.expenseAllocation.update({
                            where: { id: a.id },
                            data: { amount: Math.round((a.amount || 0) * ratio) },
                        });
                    }
                }
                // Else: sum đã mismatch từ trước → không auto-scale, user phải tự fix
            }
        }

        // 2. Update expense chính
        const updated = await tx.projectExpense.update({ where: { id }, data: updateData });

        // Idempotent: đã "Đã chi" → "Đã chi", skip toàn bộ sync debt/payment để tránh double-pay
        if (isAlreadyPaidIdempotent) {
            return updated;
        }

        // 3. Re-read debts TRONG transaction để có snapshot nhất quán
        const linkedSupplierDebt = await tx.supplierDebt.findUnique({ where: { expenseId: id } });
        const linkedContractorDebt = await tx.contractorDebt.findUnique({ where: { expenseId: id } });

        const newTotal = updateData.amount ?? existing.amount;
        const newDesc = updateData.description ?? existing.description;
        const newDate = updateData.date ? new Date(updateData.date) : existing.date;

        // 4. Sync metadata của debt (totalAmount/description/date)
        if (linkedSupplierDebt) {
            await tx.supplierDebt.update({
                where: { id: linkedSupplierDebt.id },
                data: { totalAmount: newTotal, description: newDesc, date: newDate },
            });
        }
        if (linkedContractorDebt) {
            await tx.contractorDebt.update({
                where: { id: linkedContractorDebt.id },
                data: { totalAmount: newTotal, description: newDesc, date: newDate },
            });
        }

        // 5. Auto-create SupplierPayment khi status → "Đã chi" và là NCC
        if (needSupplierPayment) {
            const alreadyLinked = await tx.supplierPayment.findUnique({ where: { expenseId: id } });
            if (!alreadyLinked) {
                await tx.supplierPayment.create({
                    data: {
                        code: preSupplierPaymentCode,
                        supplierId: existing.recipientId,
                        amount: updateData.amount ?? existing.amount,
                        date: updateData.date ? new Date(updateData.date) : existing.date,
                        notes: existing.description || '',
                        paymentAccount: updateData.paymentAccount ?? existing.paymentAccount ?? '',
                        expenseId: id,
                        createdById: session.user.id,
                    },
                });
            }
        }

        // 6. Auto-tạo DebtPayment khi status → 'Đã chi'
        if (updateData.status === 'Đã chi') {
            const payAmount = updateData.amount ?? existing.amount;
            const payDate = updateData.date ? new Date(updateData.date) : existing.date;
            const payProofUrl = updateData.proofUrl ?? existing.proofUrl ?? '';
            const payAccount = updateData.paymentAccount ?? existing.paymentAccount ?? '';

            if (linkedSupplierDebt && linkedSupplierDebt.paidAmount < newTotal) {
                await tx.supplierDebtPayment.create({
                    data: {
                        code: preSupplierDebtPaymentCode,
                        debtId: linkedSupplierDebt.id,
                        amount: payAmount,
                        date: payDate,
                        notes: existing.description || '',
                        proofUrl: payProofUrl,
                        paymentAccount: payAccount,
                        createdById: session.user.id,
                    },
                });
                const newPaid = (linkedSupplierDebt.paidAmount || 0) + payAmount;
                const newStatus = newPaid >= newTotal ? 'paid'
                    : newPaid > 0 ? 'partial' : 'open';
                await tx.supplierDebt.update({
                    where: { id: linkedSupplierDebt.id },
                    data: { paidAmount: newPaid, status: newStatus },
                });
            }
            if (linkedContractorDebt && linkedContractorDebt.paidAmount < newTotal) {
                await tx.contractorDebtPayment.create({
                    data: {
                        code: preContractorDebtPaymentCode,
                        debtId: linkedContractorDebt.id,
                        amount: payAmount,
                        date: payDate,
                        notes: existing.description || '',
                        proofUrl: payProofUrl,
                        paymentAccount: payAccount,
                        createdById: session.user.id,
                    },
                });
                const newPaid = (linkedContractorDebt.paidAmount || 0) + payAmount;
                const newStatus = newPaid >= newTotal ? 'paid'
                    : newPaid > 0 ? 'partial' : 'open';
                await tx.contractorDebt.update({
                    where: { id: linkedContractorDebt.id },
                    data: { paidAmount: newPaid, status: newStatus },
                });
            }
        }

        return updated;
    });

    return NextResponse.json(expense);
});

export const DELETE = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const expense = await prisma.projectExpense.findUnique({
        where: { id },
        include: { supplierDebt: true, contractorDebt: true },
    });
    if (!expense) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    // Service debt (cash-basis): expense sinh ra TỪ SupplierDebtPayment/ContractorDebtPayment
    // Link qua Payment.expenseId (không qua debt.expenseId). Tìm các payment đã sinh expense này.
    const [supplierPays, contractorPays] = await Promise.all([
        prisma.supplierDebtPayment.findMany({
            where: { expenseId: id },
            include: { debt: { select: { id: true, code: true, totalAmount: true, paidAmount: true, allocationPlan: true } } },
        }),
        prisma.contractorDebtPayment.findMany({
            where: { expenseId: id },
            include: { debt: { select: { id: true, code: true, totalAmount: true, paidAmount: true, allocationPlan: true } } },
        }),
    ]);

    const isServiceExpense = supplierPays.length > 0 || contractorPays.length > 0;

    if (expense.supplierDebt && expense.supplierDebt.paidAmount > 0) {
        return NextResponse.json({
            error: `Công nợ NCC ${expense.supplierDebt.code} đã có thanh toán ${expense.supplierDebt.paidAmount}. Hủy thanh toán trước khi xóa.`,
        }, { status: 422 });
    }
    if (expense.contractorDebt && expense.contractorDebt.paidAmount > 0) {
        return NextResponse.json({
            error: `Công nợ thầu phụ ${expense.contractorDebt.code} đã có thanh toán. Hủy thanh toán trước khi xóa.`,
        }, { status: 422 });
    }

    await prisma.$transaction(async (tx) => {
        // Service debt (cash-basis): revert paidAmount + xóa debt payment + ledger log
        // Ledger (SupplierPayment/ContractorPaymentLog) gắn FK `expenseId` = expense đang xóa
        // → xóa thẳng bằng deleteMany thay vì match mò supplier+amount+date.
        for (const p of supplierPays) {
            const newPaid = Math.max(0, (p.debt?.paidAmount || 0) - p.amount);
            const newStatus = newPaid <= 0 ? 'open' : (newPaid >= (p.debt?.totalAmount || 0) ? 'paid' : 'partial');
            await tx.supplierDebt.update({
                where: { id: p.debtId },
                data: { paidAmount: newPaid, status: newStatus },
            });
            await tx.supplierDebtPayment.delete({ where: { id: p.id } });
        }
        for (const p of contractorPays) {
            const newPaid = Math.max(0, (p.debt?.paidAmount || 0) - p.amount);
            const newStatus = newPaid <= 0 ? 'open' : (newPaid >= (p.debt?.totalAmount || 0) ? 'paid' : 'partial');
            await tx.contractorDebt.update({
                where: { id: p.debtId },
                data: { paidAmount: newPaid, status: newStatus },
            });
            await tx.contractorDebtPayment.delete({ where: { id: p.id } });
        }

        // Xóa ledger bằng FK expenseId (bao gồm cả ledger từ supplierPays/contractorPays ở trên
        // và bất kỳ ledger nào khác cùng expense)
        if (isServiceExpense) {
            await tx.supplierPayment.deleteMany({ where: { expenseId: id } });
            await tx.contractorPaymentLog.deleteMany({ where: { expenseId: id } });
        }

        // Accrual (debt.expenseId = expense.id): xóa debt luôn
        if (expense.supplierDebt) {
            await tx.supplierDebt.delete({ where: { id: expense.supplierDebt.id } });
        }
        if (expense.contractorDebt) {
            await tx.contractorDebt.delete({ where: { id: expense.contractorDebt.id } });
        }

        if (expense.expenseType === 'Xuất kho') {
            await tx.inventoryTransaction.deleteMany({
                where: { note: { contains: `Phiếu xuất kho ${expense.code}` } },
            });
        }

        // Service expense: xóa allocations + hard delete (bypass soft-delete) để khớp behavior
        // của endpoint /api/service-debts/[id]
        if (isServiceExpense) {
            await tx.expenseAllocation.deleteMany({ where: { expenseId: id } });
            await tx.$executeRaw`DELETE FROM "ProjectExpense" WHERE id = ${id}`;
        } else {
            await tx.projectExpense.update({
                where: { id },
                data: { deletedAt: new Date() },
            });
        }
    });

    return NextResponse.json({
        ok: true,
        revertedPayments: supplierPays.length + contractorPays.length,
    });
}, { roles: ['giam_doc', 'ke_toan'] });
