import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export const GET = withAuth(async () => {
    const [payments, transactions, expenses] = await Promise.all([
        prisma.contractPayment.findMany({
            where: { status: 'Đã thu' },
            include: {
                contract: {
                    select: {
                        code: true,
                        project: { select: { id: true, name: true } },
                    },
                },
            },
            orderBy: { paidDate: 'desc' },
        }),
        prisma.transaction.findMany({
            include: { project: { select: { id: true, name: true } } },
            orderBy: { date: 'desc' },
        }),
        prisma.projectExpense.findMany({
            where: { status: { in: ['Đã chi', 'Hoàn thành'] } },
            include: { project: { select: { id: true, name: true } } },
            orderBy: { date: 'desc' },
        }),
    ]);

    const entries = [
        ...payments.map(p => ({
            id: `cp-${p.id}`,
            date: p.paidDate || p.createdAt,
            type: 'Thu',
            source: 'contract',
            description: `Thu ${p.phase} — ${p.contract?.code || ''}`,
            projectName: p.contract?.project?.name || '—',
            projectId: p.contract?.project?.id || null,
            amount: p.paidAmount,
        })),
        ...transactions.map(t => ({
            id: `tx-${t.id}`,
            date: t.date,
            type: t.type,
            source: 'manual',
            description: t.description,
            projectName: t.project?.name || '—',
            projectId: t.projectId || null,
            amount: t.amount,
        })),
        ...expenses.map(e => ({
            id: `exp-${e.id}`,
            date: e.date,
            type: 'Chi',
            source: 'expense',
            description: e.description,
            projectName: e.project?.name || '—',
            projectId: e.projectId || null,
            amount: e.paidAmount || e.amount,
        })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalThu = entries.filter(e => e.type === 'Thu').reduce((s, e) => s + e.amount, 0);
    const totalChi = entries.filter(e => e.type === 'Chi').reduce((s, e) => s + e.amount, 0);

    const monthMap = {};
    entries.forEach(e => {
        const d = new Date(e.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap[key]) monthMap[key] = {
            key,
            label: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`,
            totalThu: 0,
            totalChi: 0,
        };
        if (e.type === 'Thu') monthMap[key].totalThu += e.amount;
        else monthMap[key].totalChi += e.amount;
    });

    let running = 0;
    const months = Object.values(monthMap)
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(m => {
            m.net = m.totalThu - m.totalChi;
            running += m.net;
            m.runningBalance = running;
            return m;
        });

    return NextResponse.json({
        entries,
        summary: { totalThu, totalChi, net: totalThu - totalChi },
        months,
    });
});
