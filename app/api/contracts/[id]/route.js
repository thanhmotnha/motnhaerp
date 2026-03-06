import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { contractUpdateSchema } from '@/lib/validations/contract';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const contract = await prisma.contract.findUnique({
        where: { id, deletedAt: null },
        include: {
            customer: true,
            project: true,
            quotation: true,
            payments: { orderBy: { createdAt: 'asc' } },
            addenda: { orderBy: { createdAt: 'desc' } },
        },
    });
    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(contract);
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const data = contractUpdateSchema.parse(body);

    // Strip non-contract fields
    const { paymentPhases, ...contractData } = data;

    // Clean date fields
    if (contractData.signDate !== undefined) contractData.signDate = contractData.signDate ? new Date(contractData.signDate) : null;
    if (contractData.startDate !== undefined) contractData.startDate = contractData.startDate ? new Date(contractData.startDate) : null;
    if (contractData.endDate !== undefined) contractData.endDate = contractData.endDate ? new Date(contractData.endDate) : null;
    if (contractData.contractValue !== undefined) contractData.contractValue = Number(contractData.contractValue) || 0;
    if (contractData.variationAmount !== undefined) contractData.variationAmount = Number(contractData.variationAmount) || 0;

    const contract = await prisma.contract.update({
        where: { id },
        data: contractData,
        include: { payments: { orderBy: { createdAt: 'asc' } } },
    });
    return NextResponse.json(contract);
});

// Soft-delete
export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.contract.update({
        where: { id },
        data: { deletedAt: new Date() },
    });
    return NextResponse.json({ success: true });
});
