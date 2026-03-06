import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Add a single payment phase
export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const data = await request.json();

    const payment = await prisma.contractPayment.create({
        data: {
            contractId: id,
            phase: data.phase || '',
            amount: Number(data.amount) || 0,
            paidAmount: Number(data.paidAmount) || 0,
            category: data.category || '',
            status: data.status || 'Chưa thu',
            notes: data.notes || '',
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
        },
    });

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

// Batch replace payment phases — PRESERVES paid data for matching phases
export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { phases } = await request.json();

    await prisma.$transaction(async (tx) => {
        // Get existing payments to preserve paid data
        const existing = await tx.contractPayment.findMany({
            where: { contractId: id },
            orderBy: { createdAt: 'asc' },
        });

        // Build lookup by phase name for preserving paid data
        const existingByPhase = {};
        for (const p of existing) {
            if (!existingByPhase[p.phase]) existingByPhase[p.phase] = p;
        }

        // Delete all existing
        await tx.contractPayment.deleteMany({ where: { contractId: id } });

        // Re-create with preserved paid data
        if (phases?.length > 0) {
            await tx.contractPayment.createMany({
                data: phases.map(p => {
                    const prev = existingByPhase[p.phase];
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
                    };
                }),
            });
        }

        // Recalc paidAmount
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
