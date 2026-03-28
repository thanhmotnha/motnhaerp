import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/apiHandler';

// GET — Monthly debt report for all NCCs and contractors
// Query: ?month=2026-03 (optional, defaults to current month)
export const GET = withAuth(async (request, context, session) => {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month');

    // Parse month or default to current month
    let year, month;
    if (monthParam) {
        const parts = monthParam.split('-');
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
    } else {
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth() + 1;
    }

    const startDate = new Date(year, month - 1, 1);       // first of month
    const endDate = new Date(year, month, 1);              // first of next month

    const label = `Tháng ${month}/${year}`;
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    // ─── NCC (Suppliers) ────────────────────────────────────────────────────

    // Get all suppliers that might have activity
    const suppliers = await prisma.supplier.findMany({
        where: { deletedAt: null },
        select: { id: true, code: true, name: true, openingBalance: true },
    });

    const nccResults = await Promise.all(
        suppliers.map(async (supplier) => {
            // PO received before startDate
            const poBeforeResult = await prisma.purchaseOrderItem.aggregate({
                _sum: { amount: true },
                where: {
                    receivedQty: { gt: 0 },
                    purchaseOrder: {
                        supplierId: supplier.id,
                        status: { in: ['Nhận một phần', 'Hoàn thành'] },
                        OR: [
                            { receivedDate: { lt: startDate } },
                            { receivedDate: null, updatedAt: { lt: startDate } },
                        ],
                    },
                },
            });

            // Payments before startDate
            const payBeforeResult = await prisma.supplierPayment.aggregate({
                _sum: { amount: true },
                where: {
                    supplierId: supplier.id,
                    date: { lt: startDate },
                },
            });

            const openingDebit = supplier.openingBalance + (poBeforeResult._sum.amount ?? 0);
            const openingCredit = payBeforeResult._sum.amount ?? 0;
            const openingBalance = openingDebit - openingCredit;

            // PO received IN the month
            const poInMonthResult = await prisma.purchaseOrderItem.aggregate({
                _sum: { amount: true },
                where: {
                    receivedQty: { gt: 0 },
                    purchaseOrder: {
                        supplierId: supplier.id,
                        status: { in: ['Nhận một phần', 'Hoàn thành'] },
                        OR: [
                            { receivedDate: { gte: startDate, lt: endDate } },
                            {
                                receivedDate: null,
                                updatedAt: { gte: startDate, lt: endDate },
                            },
                        ],
                    },
                },
            });

            // Payments IN the month
            const payInMonthResult = await prisma.supplierPayment.aggregate({
                _sum: { amount: true },
                where: {
                    supplierId: supplier.id,
                    date: { gte: startDate, lt: endDate },
                },
            });

            const phatSinh = poInMonthResult._sum.amount ?? 0;
            const daTra = payInMonthResult._sum.amount ?? 0;
            const closingBalance = openingBalance + phatSinh - daTra;

            return {
                id: supplier.id,
                code: supplier.code,
                name: supplier.name,
                openingBalance,
                phatSinh,
                daTra,
                closingBalance,
            };
        })
    );

    // Filter out suppliers with no relevant values
    const ncc = nccResults.filter(
        (s) => s.openingBalance > 0 || s.phatSinh > 0 || s.daTra > 0 || s.closingBalance > 0
    );

    // ─── Contractors ────────────────────────────────────────────────────────

    const contractors = await prisma.contractor.findMany({
        where: { deletedAt: null },
        select: { id: true, code: true, name: true, openingBalance: true },
    });

    const contractorResults = await Promise.all(
        contractors.map(async (contractor) => {
            // ContractorPayments (phases) created before startDate
            const cpBeforeResult = await prisma.contractorPayment.aggregate({
                _sum: { contractAmount: true, retentionAmount: true },
                where: {
                    contractorId: contractor.id,
                    createdAt: { lt: startDate },
                },
            });

            // ContractorPaymentLogs before startDate
            const cplBeforeResult = await prisma.contractorPaymentLog.aggregate({
                _sum: { amount: true },
                where: {
                    contractorId: contractor.id,
                    date: { lt: startDate },
                },
            });

            const contractAmountBefore = cpBeforeResult._sum.contractAmount ?? 0;
            const retentionAmountBefore = cpBeforeResult._sum.retentionAmount ?? 0;
            const openingDebt =
                contractor.openingBalance + (contractAmountBefore - retentionAmountBefore);
            const openingPaid = cplBeforeResult._sum.amount ?? 0;
            const openingBalance = openingDebt - openingPaid;

            // ContractorPayments IN the month
            const cpInMonthResult = await prisma.contractorPayment.aggregate({
                _sum: { contractAmount: true, retentionAmount: true },
                where: {
                    contractorId: contractor.id,
                    createdAt: { gte: startDate, lt: endDate },
                },
            });

            // ContractorPaymentLogs IN the month
            const cplInMonthResult = await prisma.contractorPaymentLog.aggregate({
                _sum: { amount: true },
                where: {
                    contractorId: contractor.id,
                    date: { gte: startDate, lt: endDate },
                },
            });

            const contractAmountIn = cpInMonthResult._sum.contractAmount ?? 0;
            const retentionAmountIn = cpInMonthResult._sum.retentionAmount ?? 0;
            const phatSinh = contractAmountIn - retentionAmountIn;
            const daTra = cplInMonthResult._sum.amount ?? 0;
            const closingBalance = openingBalance + phatSinh - daTra;

            return {
                id: contractor.id,
                code: contractor.code,
                name: contractor.name,
                openingBalance,
                phatSinh,
                daTra,
                closingBalance,
            };
        })
    );

    // Filter out contractors with no relevant values
    const contractorList = contractorResults.filter(
        (c) =>
            c.openingBalance > 0 ||
            c.phatSinh > 0 ||
            c.daTra > 0 ||
            c.closingBalance > 0
    );

    // ─── Totals ─────────────────────────────────────────────────────────────

    const nccOpening = ncc.reduce((acc, s) => acc + s.openingBalance, 0);
    const nccPhatSinh = ncc.reduce((acc, s) => acc + s.phatSinh, 0);
    const nccDaTra = ncc.reduce((acc, s) => acc + s.daTra, 0);
    const nccClosing = ncc.reduce((acc, s) => acc + s.closingBalance, 0);

    const contractorOpening = contractorList.reduce((acc, c) => acc + c.openingBalance, 0);
    const contractorPhatSinh = contractorList.reduce((acc, c) => acc + c.phatSinh, 0);
    const contractorDaTra = contractorList.reduce((acc, c) => acc + c.daTra, 0);
    const contractorClosing = contractorList.reduce((acc, c) => acc + c.closingBalance, 0);

    const grandTotal = nccClosing + contractorClosing;

    return NextResponse.json({
        month: monthStr,
        label,
        ncc,
        contractors: contractorList,
        totals: {
            nccOpening,
            nccPhatSinh,
            nccDaTra,
            nccClosing,
            contractorOpening,
            contractorPhatSinh,
            contractorDaTra,
            contractorClosing,
            grandTotal,
        },
    });
});
