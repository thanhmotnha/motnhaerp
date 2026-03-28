import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/apiHandler';

// GET — Merged chronological ledger for one supplier
export const GET = withAuth(async (request, context, session) => {
    const { id } = await context.params;

    // Fetch supplier
    const supplier = await prisma.supplier.findUnique({
        where: { id },
        select: {
            id: true,
            code: true,
            name: true,
            openingBalance: true,
        },
    });

    if (!supplier) {
        return NextResponse.json({ error: 'Không tìm thấy nhà cung cấp' }, { status: 404 });
    }

    // Query debt events: POs with status received (at least partially)
    const purchaseOrders = await prisma.purchaseOrder.findMany({
        where: {
            supplierId: id,
            status: { in: ['Nhận một phần', 'Hoàn thành'] },
        },
        include: {
            items: true,
            project: { select: { name: true } },
        },
        orderBy: { updatedAt: 'asc' },
    });

    // Build debt entries from POs
    const debtEntries = purchaseOrders.map((po) => {
        // Sum of received items: receivedQty * unitPrice
        const amount = po.items
            .filter((item) => item.receivedQty > 0)
            .reduce((acc, item) => acc + item.receivedQty * item.unitPrice, 0);

        const date = po.receivedDate || po.updatedAt;

        return {
            id: `po-${po.id}`,
            date,
            type: 'debt',
            ref: po.code,
            description: `Nhận hàng — ${po.code}`,
            projectName: po.project?.name || '—',
            debit: amount,
            credit: 0,
        };
    });

    // Query payments for this supplier
    const payments = await prisma.supplierPayment.findMany({
        where: { supplierId: id },
        orderBy: { date: 'asc' },
    });

    // Build payment entries
    const paymentEntries = payments.map((p) => ({
        id: `pay-${p.id}`,
        date: p.date,
        type: 'payment',
        ref: p.code,
        description: p.notes || 'Thanh toán',
        projectName: '—',
        debit: 0,
        credit: p.amount,
    }));

    // Merge and sort by date ascending
    const merged = [...debtEntries, ...paymentEntries].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
    );

    // Compute running balance starting from openingBalance
    let balance = supplier.openingBalance;
    const entries = merged.map((entry) => {
        balance += entry.debit - entry.credit;
        return { ...entry, balance };
    });

    // Summary
    const totalDebit = entries.reduce((acc, e) => acc + e.debit, 0);
    const totalCredit = entries.reduce((acc, e) => acc + e.credit, 0);
    const closingBalance = supplier.openingBalance + totalDebit - totalCredit;

    return NextResponse.json({
        supplier,
        entries,
        summary: {
            openingBalance: supplier.openingBalance,
            totalDebit,
            totalCredit,
            closingBalance,
        },
    });
});
