import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const year = parseInt(searchParams.get('year')) || new Date().getFullYear();
        const type = searchParams.get('type') || 'all'; // all, incoming, outgoing

        // ── Thu vào: ContractPayment ──
        let incoming = [];
        if (type === 'all' || type === 'incoming') {
            incoming = await prisma.contractPayment.findMany({
                where: {
                    dueDate: {
                        gte: new Date(year, 0, 1),
                        lt: new Date(year + 1, 0, 1),
                    }
                },
                include: {
                    contract: {
                        select: {
                            code: true, name: true,
                            customer: { select: { name: true } },
                            project: { select: { code: true, name: true } },
                        }
                    }
                },
                orderBy: { dueDate: 'asc' }
            });
        }

        // ── Chi ra: ContractorPayment ──
        let outgoing = [];
        if (type === 'all' || type === 'outgoing') {
            outgoing = await prisma.contractorPayment.findMany({
                where: {
                    dueDate: {
                        gte: new Date(year, 0, 1),
                        lt: new Date(year + 1, 0, 1),
                    }
                },
                include: {
                    contractor: { select: { name: true } },
                    project: { select: { code: true, name: true } },
                },
                orderBy: { dueDate: 'asc' }
            });
        }

        // Normalize data
        const now = new Date();
        const normalize = (items, direction) => items.map(p => {
            const due = p.dueDate ? new Date(p.dueDate) : null;
            const paid = direction === 'incoming' ? p.paidAmount : p.paidAmount;
            const total = direction === 'incoming' ? p.amount : p.contractAmount;
            const isPaid = direction === 'incoming'
                ? p.status === 'Đã thu'
                : p.status === 'paid';
            const isOverdue = !isPaid && due && due < now;
            const isDueSoon = !isPaid && due && due >= now && (due - now) < 7 * 24 * 60 * 60 * 1000;

            return {
                id: p.id,
                direction,
                phase: p.phase || p.description || '',
                amount: total,
                paidAmount: paid,
                remaining: total - paid,
                status: isPaid ? 'paid' : isOverdue ? 'overdue' : isDueSoon ? 'due_soon' : 'pending',
                dueDate: p.dueDate,
                paidDate: p.paidDate || p.approvedAt || null,
                month: due ? due.getMonth() : null,
                // Context
                contractCode: direction === 'incoming' ? p.contract?.code : null,
                contractName: direction === 'incoming' ? p.contract?.name : null,
                customerName: direction === 'incoming' ? p.contract?.customer?.name : null,
                contractorName: direction === 'outgoing' ? p.contractor?.name : null,
                projectCode: direction === 'incoming' ? p.contract?.project?.code : p.project?.code,
                projectName: direction === 'incoming' ? p.contract?.project?.name : p.project?.name,
            };
        });

        const allPayments = [
            ...normalize(incoming, 'incoming'),
            ...normalize(outgoing, 'outgoing'),
        ].sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        });

        // Group by month
        const byMonth = {};
        for (let m = 0; m < 12; m++) byMonth[m] = { incoming: [], outgoing: [] };
        allPayments.forEach(p => {
            if (p.month !== null) byMonth[p.month][p.direction].push(p);
        });

        // Summary per month
        const monthSummary = Object.entries(byMonth).map(([m, data]) => ({
            month: parseInt(m),
            incomingTotal: data.incoming.reduce((s, p) => s + p.amount, 0),
            incomingPaid: data.incoming.reduce((s, p) => s + p.paidAmount, 0),
            outgoingTotal: data.outgoing.reduce((s, p) => s + p.amount, 0),
            outgoingPaid: data.outgoing.reduce((s, p) => s + p.paidAmount, 0),
            incomingCount: data.incoming.length,
            outgoingCount: data.outgoing.length,
        }));

        // Overall summary
        const currentMonth = now.getMonth();
        const thisMonthPayments = allPayments.filter(p => p.month === currentMonth);
        const summary = {
            totalIncoming: allPayments.filter(p => p.direction === 'incoming').reduce((s, p) => s + p.amount, 0),
            totalOutgoing: allPayments.filter(p => p.direction === 'outgoing').reduce((s, p) => s + p.amount, 0),
            overdue: allPayments.filter(p => p.status === 'overdue').length,
            overdueAmount: allPayments.filter(p => p.status === 'overdue').reduce((s, p) => s + p.remaining, 0),
            dueSoon: allPayments.filter(p => p.status === 'due_soon').length,
            dueSoonAmount: allPayments.filter(p => p.status === 'due_soon').reduce((s, p) => s + p.remaining, 0),
            thisMonthExpected: thisMonthPayments.reduce((s, p) => s + p.amount, 0),
            thisMonthPaid: thisMonthPayments.reduce((s, p) => s + p.paidAmount, 0),
        };

        return NextResponse.json({ payments: allPayments, monthSummary, summary, year });
    } catch (err) {
        console.error('Payment schedule error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
