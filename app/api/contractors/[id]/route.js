import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
    const { id } = await params;
    const data = await request.json();
    const c = await prisma.contractor.update({ where: { id }, data });
    return NextResponse.json(c);
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        await prisma.contractorPayment.deleteMany({ where: { contractorId: id } });
        await prisma.contractor.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
