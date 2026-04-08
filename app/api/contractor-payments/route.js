import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parsePagination, paginatedResponse } from '@/lib/pagination';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const projectId = searchParams.get('projectId');
    const retentionOnly = searchParams.get('retentionOnly') === '1';

    const where = {};
    if (projectId) where.projectId = projectId;
    if (retentionOnly) {
        where.retentionAmount = { gt: 0 };
        where.retentionReleased = false;
    }

    const [data, total] = await Promise.all([
        prisma.contractorPayment.findMany({
            where,
            include: {
                contractor: { select: { name: true, code: true } },
                project: { select: { name: true, code: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.contractorPayment.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(data, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { contractorId, projectId, contractAmount, paidAmount, description, dueDate, status,
        phase, netAmount, retentionRate, retentionAmount, items, paymentAccount } = body;
    if (!contractorId) return NextResponse.json({ error: 'contractorId bắt buộc' }, { status: 400 });
    if (!projectId) return NextResponse.json({ error: 'projectId bắt buộc' }, { status: 400 });

    const totalAmount = Number(contractAmount) || 0;
    const rRate = Number(retentionRate) || 0;
    const rAmount = Number(retentionAmount) || Math.round(totalAmount * rRate / 100);
    const net = Number(netAmount) || (totalAmount - rAmount);

    const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.contractorPayment.create({
            data: {
                contractorId,
                projectId,
                contractAmount: totalAmount,
                paidAmount: Number(paidAmount) || 0,
                netAmount: net,
                retentionRate: rRate,
                retentionAmount: rAmount,
                description: description || '',
                phase: phase || '',
                dueDate: dueDate ? new Date(dueDate) : null,
                status: status || 'pending_technical',
                paymentAccount: paymentAccount || '',
            },
        });

        if (items?.length > 0) {
            await tx.contractorPaymentItem.createMany({
                data: items.map(i => ({
                    contractorPaymentId: payment.id,
                    description: i.description || '',
                    unit: i.unit || '',
                    quantity: Number(i.quantity) || 0,
                    unitPrice: Number(i.unitPrice) || 0,
                    amount: Number(i.amount) || 0,
                    notes: i.notes || '',
                })),
            });
        }

        return await tx.contractorPayment.findUnique({
            where: { id: payment.id },
            include: {
                contractor: { select: { name: true, type: true, phone: true } },
                items: true,
            },
        });
    });

    return NextResponse.json(result, { status: 201 });
});

