import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/apiHandler';
import { generateCode } from '@/lib/generateCode';

// GET — Contractor debt summary
export const GET = withAuth(async (request, context, session) => {
    const contractors = await prisma.contractor.findMany({
        where: { deletedAt: null },
        select: {
            id: true,
            code: true,
            name: true,
            openingBalance: true,
            payments: {
                select: {
                    id: true,
                    contractAmount: true,
                    retentionAmount: true,
                    retentionReleased: true,
                    projectId: true,
                    project: {
                        select: { id: true, name: true },
                    },
                },
            },
            paymentLogs: {
                select: {
                    id: true,
                    code: true,
                    amount: true,
                    date: true,
                    notes: true,
                    project: {
                        select: { name: true },
                    },
                },
                orderBy: { date: 'desc' },
                take: 20,
            },
        },
    });

    const results = contractors.map((contractor) => {
        // phatSinh = sum of (contractAmount - retentionAmount) per phase
        const phatSinh = contractor.payments.reduce(
            (acc, p) => acc + (p.contractAmount - p.retentionAmount),
            0
        );

        // giuLai = sum of retentionAmount where retentionReleased = false
        const giuLai = contractor.payments.reduce(
            (acc, p) => acc + (p.retentionReleased ? 0 : p.retentionAmount),
            0
        );

        // daTra = sum of all payment log amounts
        const daTra = contractor.paymentLogs.reduce((acc, log) => acc + log.amount, 0);

        const soDu = contractor.openingBalance + phatSinh - daTra - giuLai;

        // Per-project breakdown
        const projectMap = new Map();
        for (const p of contractor.payments) {
            const pid = p.projectId;
            if (!projectMap.has(pid)) {
                projectMap.set(pid, {
                    projectId: pid,
                    projectName: p.project?.name ?? '',
                    contractAmount: 0,
                    retentionAmount: 0,
                    phases: 0,
                });
            }
            const entry = projectMap.get(pid);
            entry.contractAmount += p.contractAmount;
            entry.retentionAmount += p.retentionAmount;
            entry.phases += 1;
        }

        return {
            id: contractor.id,
            code: contractor.code,
            name: contractor.name,
            openingBalance: contractor.openingBalance,
            phatSinh,
            giuLai,
            daTra,
            soDu,
            byProject: Array.from(projectMap.values()),
            payments: contractor.paymentLogs,
        };
    });

    // Only contractors with activity
    const filtered = results.filter(
        (c) => c.openingBalance > 0 || c.phatSinh > 0
    );

    // Sort by soDu desc
    filtered.sort((a, b) => b.soDu - a.soDu);

    const totalSoDu = filtered.reduce((acc, c) => acc + c.soDu, 0);
    const totalGiuLai = filtered.reduce((acc, c) => acc + c.giuLai, 0);

    return NextResponse.json({ contractors: filtered, totalSoDu, totalGiuLai });
});

// POST — Record contractor payment
export const POST = withAuth(async (request, context, session) => {
    const body = await request.json();
    const { contractorId, projectId, amount, date, notes } = body;

    if (!contractorId) {
        return NextResponse.json({ error: 'contractorId là bắt buộc' }, { status: 400 });
    }
    if (!amount || Number(amount) <= 0) {
        return NextResponse.json({ error: 'amount phải lớn hơn 0' }, { status: 400 });
    }

    const code = await generateCode('contractorPaymentLog', 'CP');

    const log = await prisma.contractorPaymentLog.create({
        data: {
            code,
            contractorId,
            projectId: projectId ?? null,
            amount: Number(amount),
            date: date ? new Date(date) : new Date(),
            notes: notes ?? '',
            createdById: session.user.id,
        },
    });

    return NextResponse.json(log, { status: 201 });
});

// PATCH — Update contractor openingBalance
export const PATCH = withAuth(async (request, context, session) => {
    const body = await request.json();
    const { contractorId, openingBalance } = body;

    if (!contractorId) {
        return NextResponse.json({ error: 'contractorId là bắt buộc' }, { status: 400 });
    }

    const updated = await prisma.contractor.update({
        where: { id: contractorId },
        data: { openingBalance: Number(openingBalance) },
        select: {
            id: true,
            code: true,
            name: true,
            openingBalance: true,
        },
    });

    return NextResponse.json(updated);
});
