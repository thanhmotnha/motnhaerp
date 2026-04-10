import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { transactionCreateSchema } from '@/lib/validations/transaction';

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
    const [receivables, payables, income, expense, expApproved, expPaid, expPending, upcomingPayments, supplierDebt] = await Promise.all([
        prisma.contractPayment.aggregate({ where: { contract: { deletedAt: null } }, _sum: { amount: true, paidAmount: true } }),
        prisma.contractorPayment.aggregate({ _sum: { contractAmount: true, paidAmount: true } }),
        prisma.transaction.aggregate({ where: { type: 'Thu' }, _sum: { amount: true } }),
        prisma.transaction.aggregate({ where: { type: 'Chi' }, _sum: { amount: true } }),
        prisma.projectExpense.aggregate({ where: { status: { not: 'Từ chối' } }, _sum: { amount: true } }),
        prisma.projectExpense.aggregate({ where: { status: { in: ['Đã chi', 'Hoàn thành'] } }, _sum: { amount: true } }),
        prisma.projectExpense.aggregate({ where: { status: 'Chờ duyệt' }, _sum: { amount: true } }),
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
    ]);

    const totalExpenseApproved = expApproved._sum.amount || 0;
    const totalExpensePaid = expPaid._sum.amount || 0;
    const totalExpensePending = expPending._sum.amount || 0;

    return NextResponse.json({
        transactions,
        upcomingPayments,
        supplierDebt: supplierDebt.filter(po => (po.paidAmount || 0) < (po.totalAmount || 0)),
        summary: {
            totalReceivable: receivables._sum.amount || 0,
            totalReceived: receivables._sum.paidAmount || 0,
            receivableOutstanding: (receivables._sum.amount || 0) - (receivables._sum.paidAmount || 0),
            totalPayable: payables._sum.contractAmount || 0,
            totalPaid: payables._sum.paidAmount || 0,
            payableOutstanding: (payables._sum.contractAmount || 0) - (payables._sum.paidAmount || 0),
            totalExpenseApproved,
            totalExpensePaid,
            totalExpensePending,
            manualIncome: income._sum.amount || 0,
            manualExpense: expense._sum.amount || 0,
            netCashflow: (receivables._sum.paidAmount || 0) + (income._sum.amount || 0)
                - (payables._sum.paidAmount || 0) - totalExpensePaid - (expense._sum.amount || 0),
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
