import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET/DELETE single service debt.
 *
 * Service debt = SupplierDebt hoặc ContractorDebt có `allocationPlan != null`.
 * Khi thanh toán, sẽ tự sinh ProjectExpense (expenseType='Dịch vụ') + ExpenseAllocation
 * pro-rata (xem lib/serviceDebtExpense.js). Payment records link qua `expenseId`.
 *
 * DELETE ở đây rollback full: xóa expenses + allocations do payments sinh ra,
 * xóa payments, rồi xóa debt.
 */

/**
 * Tìm debt theo id, thử SupplierDebt trước, fallback ContractorDebt.
 * Trả về { debt, kind } với kind = 'supplier' | 'contractor' | null.
 */
async function findDebt(id, { withPayments = true } = {}) {
    const supplierInclude = withPayments
        ? {
              supplier: { select: { id: true, code: true, name: true } },
              payments: {
                  orderBy: { date: 'desc' },
              },
          }
        : { supplier: { select: { id: true, code: true, name: true } } };

    const supplier = await prisma.supplierDebt.findUnique({
        where: { id },
        include: supplierInclude,
    });
    if (supplier) return { debt: supplier, kind: 'supplier' };

    const contractorInclude = withPayments
        ? {
              contractor: { select: { id: true, code: true, name: true } },
              project: { select: { id: true, code: true, name: true } },
              payments: { orderBy: { date: 'desc' } },
          }
        : {
              contractor: { select: { id: true, code: true, name: true } },
              project: { select: { id: true, code: true, name: true } },
          };

    const contractor = await prisma.contractorDebt.findUnique({
        where: { id },
        include: contractorInclude,
    });
    if (contractor) return { debt: contractor, kind: 'contractor' };

    return { debt: null, kind: null };
}

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { debt, kind } = await findDebt(id);
    if (!debt) {
        return NextResponse.json({ error: 'Không tìm thấy công nợ dịch vụ' }, { status: 404 });
    }

    // Enrich allocationPlan với tên project
    let allocationPlan = Array.isArray(debt.allocationPlan) ? debt.allocationPlan : [];
    if (allocationPlan.length > 0) {
        const projectIds = allocationPlan.map(a => a.projectId).filter(Boolean);
        const projects = projectIds.length
            ? await prisma.project.findMany({
                  where: { id: { in: projectIds } },
                  select: { id: true, code: true, name: true },
              })
            : [];
        const pMap = new Map(projects.map(p => [p.id, p]));
        allocationPlan = allocationPlan.map(a => ({
            ...a,
            project: pMap.get(a.projectId) || null,
        }));
    }

    // Lấy expenses đã sinh từ payments.expenseId
    const expenseIds = (debt.payments || [])
        .map(p => p.expenseId)
        .filter(Boolean);

    const expenses = expenseIds.length
        ? await prisma.projectExpense.findMany({
              where: { id: { in: expenseIds } },
              include: {
                  allocations: {
                      include: {
                          project: { select: { id: true, code: true, name: true } },
                      },
                  },
              },
              orderBy: { date: 'desc' },
          })
        : [];

    const recipientType = kind === 'supplier' ? 'NCC' : 'Thầu phụ';
    const recipientName =
        kind === 'supplier' ? debt.supplier?.name || '' : debt.contractor?.name || '';

    return NextResponse.json({
        ...debt,
        recipientType,
        recipientName,
        remaining: (debt.totalAmount || 0) - (debt.paidAmount || 0),
        allocationPlan,
        expenses,
    });
});

export const DELETE = withAuth(
    async (request, { params }) => {
        const { id } = await params;
        const { debt, kind } = await findDebt(id);

        if (!debt) {
            return NextResponse.json({ error: 'Không tìm thấy công nợ dịch vụ' }, { status: 404 });
        }

        if (!debt.allocationPlan) {
            return NextResponse.json(
                { error: 'Endpoint này chỉ xóa service debt' },
                { status: 400 }
            );
        }

        const expenseIds = (debt.payments || [])
            .map(p => p.expenseId)
            .filter(Boolean);

        const paymentIds = (debt.payments || []).map(p => p.id);

        const result = await prisma.$transaction(async (tx) => {
            // 1. Xóa ExpenseAllocation (FK cascade sẽ tự xử khi expense bị xóa,
            //    nhưng làm explicit cho chắc vì ta dùng raw SQL để hard-delete expense)
            if (expenseIds.length > 0) {
                await tx.expenseAllocation.deleteMany({
                    where: { expenseId: { in: expenseIds } },
                });
            }

            // 2. Hard delete ProjectExpense qua raw SQL (bypass soft-delete extension)
            let deletedExpenses = 0;
            if (expenseIds.length > 0) {
                deletedExpenses = await tx.$executeRaw`DELETE FROM "ProjectExpense" WHERE id = ANY(${expenseIds})`;
            }

            // 3. Xóa payments + ledger log đồng bộ
            let deletedPayments = 0;
            const payments = debt.payments || [];
            if (kind === 'supplier') {
                for (const p of payments) {
                    const dayStart = new Date(p.date); dayStart.setHours(0, 0, 0, 0);
                    const dayEnd = new Date(p.date); dayEnd.setHours(23, 59, 59, 999);
                    const ledger = await tx.supplierPayment.findFirst({
                        where: { supplierId: debt.supplierId, amount: p.amount, date: { gte: dayStart, lte: dayEnd } },
                        orderBy: { createdAt: 'desc' },
                    });
                    if (ledger) await tx.supplierPayment.delete({ where: { id: ledger.id } });
                }
                const res = await tx.supplierDebtPayment.deleteMany({ where: { debtId: debt.id } });
                deletedPayments = res.count;
            } else {
                for (const p of payments) {
                    const dayStart = new Date(p.date); dayStart.setHours(0, 0, 0, 0);
                    const dayEnd = new Date(p.date); dayEnd.setHours(23, 59, 59, 999);
                    const ledger = await tx.contractorPaymentLog.findFirst({
                        where: { contractorId: debt.contractorId, amount: p.amount, date: { gte: dayStart, lte: dayEnd } },
                        orderBy: { createdAt: 'desc' },
                    });
                    if (ledger) await tx.contractorPaymentLog.delete({ where: { id: ledger.id } });
                }
                const res = await tx.contractorDebtPayment.deleteMany({ where: { debtId: debt.id } });
                deletedPayments = res.count;
            }

            // 4. Xóa debt. SupplierDebt/ContractorDebt không có deletedAt field,
            //    nên prisma.delete sẽ hard-delete bình thường (soft-delete extension
            //    chỉ áp cho models trong whitelist).
            if (kind === 'supplier') {
                await tx.supplierDebt.delete({ where: { id: debt.id } });
            } else {
                await tx.contractorDebt.delete({ where: { id: debt.id } });
            }

            return {
                deletedExpenses: Number(deletedExpenses) || 0,
                deletedPayments: deletedPayments || paymentIds.length,
            };
        });

        return NextResponse.json({
            success: true,
            deletedExpenses: result.deletedExpenses,
            deletedPayments: result.deletedPayments,
        });
    },
    { roles: ['giam_doc', 'ke_toan'] }
);
