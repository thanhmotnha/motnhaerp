import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '90');
    const now = new Date();
    const horizon = new Date(now.getTime() + days * 86400000);

    const [inflows, outflowsPO, payroll] = await Promise.all([
        // Thu từ KH: ContractPayment chưa thu, có dueDate trong horizon
        prisma.contractPayment.findMany({
            where: {
                status: { not: 'Đã thu' },
                dueDate: { lte: horizon },
            },
            select: {
                id: true, phase: true, amount: true, paidAmount: true, dueDate: true,
                contract: {
                    select: {
                        code: true,
                        project: { select: { name: true } },
                        customer: { select: { name: true } },
                    },
                },
            },
        }),
        // Chi PO: PO chưa thanh toán, deliveryDate trong horizon
        prisma.purchaseOrder.findMany({
            where: {
                status: { in: ['Đang giao', 'Đã giao', 'Chờ duyệt'] },
                deliveryDate: { lte: horizon },
            },
            select: {
                id: true, code: true, supplier: true, totalAmount: true, paidAmount: true, deliveryDate: true,
                project: { select: { name: true } },
            },
        }),
        // Chi lương: tổng lương NV đang làm (monthly fixed)
        prisma.employee.findMany({
            where: { status: 'Đang làm', deletedAt: null },
            select: { salary: true },
        }),
    ]);

    const monthlyPayroll = payroll.reduce((s, e) => s + (e.salary || 0), 0);

    // Build weekly buckets
    const weeks = [];
    for (let i = 0; i < Math.ceil(days / 7); i++) {
        const wStart = new Date(now.getTime() + i * 7 * 86400000);
        const wEnd = new Date(now.getTime() + (i + 1) * 7 * 86400000);
        weeks.push({ label: `T${i + 1}`, start: wStart, end: wEnd, inflow: 0, outflow: 0, items: [] });
    }

    // Assign inflows
    for (const p of inflows) {
        const outstanding = (p.amount || 0) - (p.paidAmount || 0);
        if (outstanding <= 0) continue;
        const d = p.dueDate ? new Date(p.dueDate) : now;
        const w = weeks.find(w => d >= w.start && d < w.end);
        if (w) {
            w.inflow += outstanding;
            w.items.push({ type: 'in', label: `${p.contract?.customer?.name || ''} — ${p.phase}`, amount: outstanding, date: d });
        }
    }

    // Assign outflows — PO
    for (const po of outflowsPO) {
        const outstanding = (po.totalAmount || 0) - (po.paidAmount || 0);
        if (outstanding <= 0) continue;
        const d = po.deliveryDate ? new Date(po.deliveryDate) : now;
        const w = weeks.find(w => d >= w.start && d < w.end);
        if (w) {
            w.outflow += outstanding;
            w.items.push({ type: 'out', label: `PO ${po.code} — ${po.supplier}`, amount: outstanding, date: d });
        }
    }

    // Assign payroll per month (first Monday of each month within horizon)
    const seen = new Set();
    for (const w of weeks) {
        const monthKey = `${w.start.getFullYear()}-${w.start.getMonth()}`;
        if (!seen.has(monthKey)) {
            seen.add(monthKey);
            w.outflow += monthlyPayroll;
            if (monthlyPayroll > 0) w.items.push({ type: 'out', label: 'Lương nhân viên', amount: monthlyPayroll, date: w.start });
        }
    }

    // Running balance
    let balance = 0;
    const result = weeks.map(w => {
        balance += w.inflow - w.outflow;
        return { label: w.label, start: w.start, end: w.end, inflow: w.inflow, outflow: w.outflow, net: w.inflow - w.outflow, balance, items: w.items, alert: balance < 0 };
    });

    const totalInflow = result.reduce((s, w) => s + w.inflow, 0);
    const totalOutflow = result.reduce((s, w) => s + w.outflow, 0);

    return NextResponse.json({ weeks: result, totalInflow, totalOutflow, netCashflow: totalInflow - totalOutflow, monthlyPayroll });
});
