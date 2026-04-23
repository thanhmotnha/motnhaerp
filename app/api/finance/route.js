import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { transactionCreateSchema } from '@/lib/validations/transaction';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const type = searchParams.get('type');

    const where = {};
    if (type) where.type = type;

    const [txList, total] = await Promise.all([
        prisma.transaction.findMany({
            where,
            include: { project: { select: { name: true } } },
            orderBy: { date: 'desc' },
            skip,
            take: limit,
        }),
        prisma.transaction.count({ where }),
    ]);
    const transactions = paginatedResponse(txList, total, { page, limit });

    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // All summary queries in parallel
    const [
        receivables,
        payables,
        income,
        expense,
        expApproved,
        expPaid,
        expPending,
        upcomingPayments,
        supplierDebt,
        supplierDebtAccrualAgg,
        supplierDebtServiceAgg,
        contractorDebtAccrualAgg,
        contractorDebtServiceAgg,
    ] = await Promise.all([
        prisma.contractPayment.aggregate({ where: { contract: { deletedAt: null } }, _sum: { amount: true, paidAmount: true } }),
        prisma.contractorPayment.aggregate({ _sum: { contractAmount: true, paidAmount: true } }),
        prisma.transaction.aggregate({ where: { type: 'Thu' }, _sum: { amount: true } }),
        prisma.transaction.aggregate({ where: { type: 'Chi' }, _sum: { amount: true } }),
        prisma.projectExpense.aggregate({ where: { deletedAt: null, status: { not: 'Từ chối' } }, _sum: { amount: true } }),
        prisma.projectExpense.aggregate({ where: { deletedAt: null, status: { in: ['Đã chi', 'Hoàn thành'] } }, _sum: { amount: true } }),
        prisma.projectExpense.aggregate({ where: { deletedAt: null, status: 'Chờ duyệt' }, _sum: { amount: true } }),
        prisma.contractPayment.findMany({
            where: {
                status: { not: 'Đã thu' },
                dueDate: { lte: sevenDaysFromNow },
                contract: { deletedAt: null },
            },
            include: {
                contract: {
                    select: {
                        code: true,
                        project: { select: { name: true } },
                    },
                },
            },
            orderBy: { dueDate: 'asc' },
            take: 20,
        }),
        prisma.purchaseOrder.findMany({
            where: {
                status: { not: 'Đã hủy' },
                totalAmount: { gt: 0 },
            },
            select: {
                id: true,
                code: true,
                supplier: true,
                totalAmount: true,
                paidAmount: true,
                orderDate: true,
                project: { select: { name: true } },
                supplierRel: { select: { name: true } },
            },
            orderBy: { orderDate: 'desc' },
            take: 100,
        }),
        // SupplierDebt accrual (debt thường, allocationPlan = null)
        prisma.supplierDebt.aggregate({
            where: { allocationPlan: null },
            _sum: { totalAmount: true, paidAmount: true },
        }),
        // SupplierDebt service (cash-basis, có allocationPlan)
        prisma.supplierDebt.aggregate({
            where: { allocationPlan: { not: null } },
            _sum: { totalAmount: true, paidAmount: true },
        }),
        // ContractorDebt accrual
        prisma.contractorDebt.aggregate({
            where: { allocationPlan: null },
            _sum: { totalAmount: true, paidAmount: true },
        }),
        // ContractorDebt service
        prisma.contractorDebt.aggregate({
            where: { allocationPlan: { not: null } },
            _sum: { totalAmount: true, paidAmount: true },
        }),
    ]);

    const totalExpenseApproved = expApproved._sum.amount || 0;
    const totalExpensePaid = expPaid._sum.amount || 0;
    const totalExpensePending = expPending._sum.amount || 0;

    const supplierDebtAccrualTotal = supplierDebtAccrualAgg._sum.totalAmount || 0;
    const supplierDebtAccrualPaid = supplierDebtAccrualAgg._sum.paidAmount || 0;
    const supplierDebtServiceTotal = supplierDebtServiceAgg._sum.totalAmount || 0;
    const supplierDebtServicePaid = supplierDebtServiceAgg._sum.paidAmount || 0;
    const contractorDebtAccrualTotal = contractorDebtAccrualAgg._sum.totalAmount || 0;
    const contractorDebtAccrualPaid = contractorDebtAccrualAgg._sum.paidAmount || 0;
    const contractorDebtServiceTotal = contractorDebtServiceAgg._sum.totalAmount || 0;
    const contractorDebtServicePaid = contractorDebtServiceAgg._sum.paidAmount || 0;

    const supplierDebtTotal = supplierDebtAccrualTotal + supplierDebtServiceTotal;
    const supplierDebtPaid = supplierDebtAccrualPaid + supplierDebtServicePaid;
    const contractorDebtTotal = contractorDebtAccrualTotal + contractorDebtServiceTotal;
    const contractorDebtPaid = contractorDebtAccrualPaid + contractorDebtServicePaid;

    // Tổng công nợ phải trả = tiến độ thầu phụ + NCC debt + Thầu phụ debt (đồng bộ với /cong-no)
    const totalPayable = (payables._sum.contractAmount || 0) + supplierDebtTotal + contractorDebtTotal;
    const totalPaidPayable = (payables._sum.paidAmount || 0) + supplierDebtPaid + contractorDebtPaid;

    return NextResponse.json({
        transactions,
        upcomingPayments,
        supplierDebt: supplierDebt.filter(po => (po.paidAmount || 0) < (po.totalAmount || 0)),
        summary: {
            totalReceivable: receivables._sum.amount || 0,
            totalReceived: receivables._sum.paidAmount || 0,
            receivableOutstanding: (receivables._sum.amount || 0) - (receivables._sum.paidAmount || 0),
            totalPayable,
            totalPaid: totalPaidPayable,
            payableOutstanding: totalPayable - totalPaidPayable,
            // Chi tiết từng loại công nợ để UI phân tách nếu cần
            payableBreakdown: {
                contractorProgress: (payables._sum.contractAmount || 0) - (payables._sum.paidAmount || 0),
                // Backward-compat: tổng gộp (accrual + service)
                supplierDebt: supplierDebtTotal - supplierDebtPaid,
                contractorDebt: contractorDebtTotal - contractorDebtPaid,
                // Tách theo allocationPlan — accrual (debt thường) vs service (cash-basis)
                supplierDebtAccrual: supplierDebtAccrualTotal - supplierDebtAccrualPaid,
                supplierDebtService: supplierDebtServiceTotal - supplierDebtServicePaid,
                contractorDebtAccrual: contractorDebtAccrualTotal - contractorDebtAccrualPaid,
                contractorDebtService: contractorDebtServiceTotal - contractorDebtServicePaid,
            },
            totalExpenseApproved,
            totalExpensePaid,
            totalExpensePending,
            manualIncome: income._sum.amount || 0,
            manualExpense: expense._sum.amount || 0,
            netCashflow: (receivables._sum.paidAmount || 0) + (income._sum.amount || 0)
                - totalPaidPayable - totalExpensePaid - (expense._sum.amount || 0),
        },
    });
}, { roles: ['giam_doc', 'ke_toan'] });

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const validated = transactionCreateSchema.parse(body);

    const code = await generateCode('transaction', 'GD');
    const tx = await prisma.transaction.create({
        data: {
            code,
            type: validated.type,
            description: validated.description,
            amount: validated.amount,
            category: validated.category,
            date: validated.date || new Date(),
            projectId: validated.projectId,
        },
    });
    return NextResponse.json(tx, { status: 201 });
}, { roles: ['giam_doc', 'ke_toan'] });
