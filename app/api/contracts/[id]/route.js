import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const { id } = await params;
    const contract = await prisma.contract.findUnique({
        where: { id },
        include: { customer: true, project: true, quotation: true, payments: { orderBy: { createdAt: 'asc' } } },
    });
    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(contract);
}

export async function PUT(request, { params }) {
    const { id } = await params;
    const data = await request.json();
    const contract = await prisma.contract.update({ where: { id }, data });
    return NextResponse.json(contract);
}

export async function DELETE(request, { params }) {
    const { id } = await params;
    await prisma.contractPayment.deleteMany({ where: { contractId: id } });
    await prisma.contract.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
