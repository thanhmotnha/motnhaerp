import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Add a single payment phase
export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const data = await request.json();

    const payment = await prisma.$transaction(async (tx) => {
        const created = await tx.contractPayment.create({
            data: {
                contractId: id,
                phase: data.phase || '',
                amount: Number(data.amount) || 0,
                paidAmount: Number(data.paidAmount) || 0,
                category: data.category || '',
                status: data.status || 'Chưa thu',
                notes: data.notes || '',
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
                isVariation: Boolean(data.isVariation),
            },
        });
        const total = await tx.contractPayment.aggregate({
            where: { contractId: id },
            _sum: { paidAmount: true },
        });
        await tx.contract.update({
            where: { id },
            data: { paidAmount: total._sum.paidAmount || 0 },
        });
        return created;
    });

    return NextResponse.json(payment);
});

// PATCH — update a single payment (proof, paidAmount, paidDate, status)
export const PATCH = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { paymentId, proofUrl, paidAmount, paidDate, status } = await request.json();
    if (!paymentId) return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 });

    const data = {};
    if (proofUrl !== undefined) data.proofUrl = proofUrl;
    if (paidAmount !== undefined) data.paidAmount = Number(paidAmount) || 0;
    if (paidDate !== undefined) data.paidDate = paidDate ? new Date(paidDate) : null;
    if (status !== undefined) data.status = status;

    const payment = await prisma.contractPayment.update({ where: { id: paymentId, contractId: id }, data });

    // Recalc contract paidAmount
    const total = await prisma.contractPayment.aggregate({
        where: { contractId: id },
        _sum: { paidAmount: true },
    });
    await prisma.contract.update({
        where: { id },
        data: { paidAmount: total._sum.paidAmount || 0 },
    });

    return NextResponse.json(payment);
});

// PUT — batch replace all payment phases
export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { phases } = await request.json();

    // Validation: base phases sum ≤ 100%, variation phases sum ≤ variationAmount
    if (phases?.length > 0) {
        const contract = await prisma.contract.findUnique({ where: { id }, select: { variationAmount: true } });
        const variationAmount = contract?.variationAmount || 0;

        const basePhases = phases.filter(p => !p.isVariation);
        const varPhases = phases.filter(p => p.isVariation);

        const basePctTotal = basePhases.reduce((s, p) => s + (Number(p.pct) || 0), 0);
        if (basePctTotal > 100) {
            return NextResponse.json({ error: `Tổng đợt gốc đang là ${basePctTotal}% — vượt 100%` }, { status: 400 });
        }

        const varAmountTotal = varPhases.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        if (variationAmount > 0 && varAmountTotal > variationAmount) {
            return NextResponse.json({ error: `Tổng đợt phát sinh (${varAmountTotal.toLocaleString('vi-VN')}) vượt giá trị phát sinh (${variationAmount.toLocaleString('vi-VN')})` }, { status: 400 });
        }
    }

    await prisma.$transaction(async (tx) => {
        const existing = await tx.contractPayment.findMany({
            where: { contractId: id },
            orderBy: { createdAt: 'asc' },
        });

        const existingById = {};
        const existingByPhase = {};
        for (const p of existing) {
            existingById[p.id] = p;
            if (!existingByPhase[p.phase]) existingByPhase[p.phase] = p;
        }

        await tx.contractPayment.deleteMany({ where: { contractId: id } });

        if (phases?.length > 0) {
            await tx.contractPayment.createMany({
                data: phases.map(p => {
                    const prev = (p.id && existingById[p.id]) || existingByPhase[p.phase];
                    return {
                        contractId: id,
                        phase: p.phase || '',
                        amount: Number(p.amount) || 0,
                        paidAmount: prev?.paidAmount || Number(p.paidAmount) || 0,
                        category: p.category || prev?.category || '',
                        status: prev?.status || p.status || 'Chưa thu',
                        notes: prev?.notes || p.notes || '',
                        proofUrl: prev?.proofUrl || '',
                        paidDate: prev?.paidDate || null,
                        dueDate: p.dueDate ? new Date(p.dueDate) : prev?.dueDate || null,
                        retentionRate: Number(p.retentionRate) || 0,
                        retentionAmount: Number(p.retentionAmount) || 0,
                        isVariation: Boolean(p.isVariation),
                    };
                }),
            });
        }

        const total = await tx.contractPayment.aggregate({
            where: { contractId: id },
            _sum: { paidAmount: true },
        });
        await tx.contract.update({
            where: { id },
            data: { paidAmount: total._sum.paidAmount || 0 },
        });
    });

    const payments = await prisma.contractPayment.findMany({
        where: { contractId: id },
        orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(payments);
});
