import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month');   // e.g. "2026-03"
    const typeParam = searchParams.get('type');     // "Thu" | "Chi"
    const projectIdParam = searchParams.get('projectId');

    // Build date range filter when ?month= is provided
    let dateRange = null;
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
        const [year, month] = monthParam.split('-').map(Number);
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 1);
        dateRange = { gte: start, lt: end };
    }

    const [payments, transactions, expenses] = await Promise.all([
        prisma.contractPayment.findMany({
            where: {
                status: 'Đã thu',
                ...(dateRange ? { paidDate: dateRange } : {}),
            },
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
            where: {
                ...(dateRange ? { date: dateRange } : {}),
            },
            include: { project: { select: { id: true, name: true } } },
            orderBy: { date: 'desc' },
        }),
        prisma.projectExpense.findMany({
            where: {
                status: { in: ['Đã chi', 'Hoàn thành'] },
                ...(dateRange ? { date: dateRange } : {}),
            },
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

    // Apply post-merge filters
    const filteredEntries = entries.filter(e => {
        if (typeParam && e.type !== typeParam) return false;
        if (projectIdParam && e.projectId !== projectIdParam) return false;
        return true;
    });

    const totalThu = filteredEntries.filter(e => e.type === 'Thu').reduce((s, e) => s + e.amount, 0);
    const totalChi = filteredEntries.filter(e => e.type === 'Chi').reduce((s, e) => s + e.amount, 0);

    const monthMap = {};
    filteredEntries.forEach(e => {
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
        entries: filteredEntries,
        summary: { totalThu, totalChi, net: totalThu - totalChi },
        months,
    });
});
