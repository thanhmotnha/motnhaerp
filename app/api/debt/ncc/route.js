import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/apiHandler';
import { generateCode } from '@/lib/generateCode';

// GET — Supplier debt summary
export const GET = withAuth(async (request, context, session) => {
    // Fetch all active suppliers with their payments
    const suppliers = await prisma.supplier.findMany({
        where: { deletedAt: null },
        select: {
            id: true,
            code: true,
            name: true,
            openingBalance: true,
            supplierPayments: {
                select: {
                    id: true,
                    code: true,
                    amount: true,
                    date: true,
                    notes: true,
                },
                orderBy: { date: 'desc' },
                take: 10,
            },
        },
    });

    // For each supplier, calculate phatSinh from received PO items + service debts
    const results = await Promise.all(
        suppliers.map(async (supplier) => {
            // Sum of received PO item values for this supplier
            const phatSinhResult = await prisma.purchaseOrderItem.aggregate({
                _sum: { amount: true },
                where: {
                    receivedQty: { gt: 0 },
                    purchaseOrder: {
                        supplierId: supplier.id,
                    },
                },
            });

            // Sum of SupplierDebt totalAmount (bao gồm cả service debt có allocationPlan + debt thường)
            const debtSumResult = await prisma.supplierDebt.aggregate({
                _sum: { totalAmount: true, paidAmount: true },
                where: { supplierId: supplier.id },
            });
            const debtTotal = debtSumResult._sum.totalAmount ?? 0;
            const debtPaid = debtSumResult._sum.paidAmount ?? 0;
            const debtRemaining = debtTotal - debtPaid;

            const phatSinh = (phatSinhResult._sum.amount ?? 0) + debtTotal;

            // For daTra we need ALL payments, not just last 10
            const daTraTotalResult = await prisma.supplierPayment.aggregate({
                _sum: { amount: true },
                where: { supplierId: supplier.id },
            });
            const daTraTotal = daTraTotalResult._sum.amount ?? 0;

            const soDu = supplier.openingBalance + phatSinh - daTraTotal;

            return {
                id: supplier.id,
                code: supplier.code,
                name: supplier.name,
                openingBalance: supplier.openingBalance,
                phatSinh,
                daTra: daTraTotal,
                soDu,
                serviceDebtRemaining: debtRemaining,
                payments: supplier.supplierPayments,
            };
        })
    );

    // Filter out suppliers with no activity (include suppliers có service/accrual debt)
    const filtered = results.filter(
        (s) => s.openingBalance > 0 || s.phatSinh > 0 || s.serviceDebtRemaining > 0
    );

    // Sort by soDu desc
    filtered.sort((a, b) => b.soDu - a.soDu);

    const totalSoDu = filtered.reduce((acc, s) => acc + s.soDu, 0);

    return NextResponse.json({ suppliers: filtered, totalSoDu });
}, { roles: ['giam_doc', 'ke_toan'] });

// POST — Record supplier payment
export const POST = withAuth(async (request, context, session) => {
    const body = await request.json();
    const { supplierId, amount, date, notes } = body;

    if (!supplierId) {
        return NextResponse.json({ error: 'supplierId là bắt buộc' }, { status: 400 });
    }
    if (!amount || Number(amount) <= 0) {
        return NextResponse.json({ error: 'amount phải lớn hơn 0' }, { status: 400 });
    }

    const code = await generateCode('supplierPayment', 'SP');

    const payment = await prisma.supplierPayment.create({
        data: {
            code,
            supplierId,
            amount: Number(amount),
            date: date ? new Date(date) : new Date(),
            notes: notes ?? '',
            paymentAccount: body.paymentAccount || '',
            createdById: session.user.id,
        },
    });

    return NextResponse.json(payment, { status: 201 });
}, { roles: ['giam_doc', 'ke_toan'] });

// PATCH — Update supplier openingBalance
export const PATCH = withAuth(async (request, context, session) => {
    const body = await request.json();
    const { supplierId, openingBalance } = body;

    if (!supplierId) {
        return NextResponse.json({ error: 'supplierId là bắt buộc' }, { status: 400 });
    }

    const updated = await prisma.supplier.update({
        where: { id: supplierId },
        data: { openingBalance: Number(openingBalance) },
        select: {
            id: true,
            code: true,
            name: true,
            openingBalance: true,
        },
    });

    return NextResponse.json(updated);
}, { roles: ['giam_doc', 'ke_toan'] });
