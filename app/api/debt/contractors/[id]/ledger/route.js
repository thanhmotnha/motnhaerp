import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/apiHandler';

export const GET = withAuth(async (request, context, session) => {
    const { id } = await context.params;

    const contractor = await prisma.contractor.findUnique({
        where: { id },
        select: { id: true, code: true, name: true, openingBalance: true },
    });

    if (!contractor) {
        return NextResponse.json({ error: 'Không tìm thấy nhà thầu' }, { status: 404 });
    }

    // Debt events: ContractorPayment phases (quyết toán)
    const phases = await prisma.contractorPayment.findMany({
        where: { contractorId: id },
        include: { project: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
    });

    // Payment events: ContractorPaymentLog
    const paymentLogs = await prisma.contractorPaymentLog.findMany({
        where: { contractorId: id },
        include: { project: { select: { name: true } } },
        orderBy: { date: 'asc' },
    });

    // Build debt entries from phases (contractAmount - retentionAmount = net payable)
    const debtEntries = phases.map((phase) => ({
        id: `phase-${phase.id}`,
        date: phase.createdAt,
        type: 'debt',
        ref: `QT-${phase.id.slice(0, 6)}`,
        description: 'Quyết toán',
        projectName: phase.project?.name || '—',
        debit: phase.contractAmount - phase.retentionAmount,
        credit: 0,
    }));

    // Retention release entries (only for phases where retention was released)
    const retentionEntries = phases
        .filter((phase) => phase.retentionReleased && phase.retentionAmount > 0)
        .map((phase) => ({
            id: `retention-${phase.id}`,
            date: phase.updatedAt,
            type: 'retention',
            ref: `BH-${phase.id.slice(0, 6)}`,
            description: 'Giải phóng BH',
            projectName: phase.project?.name || '—',
            debit: 0,
            credit: phase.retentionAmount,
        }));

    // Payment entries
    const paymentEntries = paymentLogs.map((log) => ({
        id: `pay-${log.id}`,
        date: log.date,
        type: 'payment',
        ref: log.code,
        description: log.notes || 'Thanh toán',
        projectName: log.project?.name || '—',
        debit: 0,
        credit: log.amount,
    }));

    // Merge and sort by date ascending
    const merged = [...debtEntries, ...retentionEntries, ...paymentEntries].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
    );

    // Running balance starting from openingBalance
    let balance = contractor.openingBalance;
    const entries = merged.map((entry) => {
        balance += entry.debit - entry.credit;
        return { ...entry, balance };
    });

    const totalDebit = entries.reduce((acc, e) => acc + e.debit, 0);
    const totalCredit = entries.reduce((acc, e) => acc + e.credit, 0);
    // giuLai = retention not yet released
    const giuLai = phases.reduce(
        (acc, p) => acc + (p.retentionReleased ? 0 : p.retentionAmount),
        0
    );
    const closingBalance = contractor.openingBalance + totalDebit - totalCredit;

    return NextResponse.json({
        contractor,
        entries,
        summary: {
            openingBalance: contractor.openingBalance,
            totalDebit,
            totalCredit,
            giuLai,
            closingBalance,
        },
    });
}, { roles: ["giam_doc", "ke_toan"] });
