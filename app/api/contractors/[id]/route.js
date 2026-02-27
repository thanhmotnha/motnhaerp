import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { contractorUpdateSchema } from '@/lib/validations/contractor';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const data = contractorUpdateSchema.parse(body);
    const c = await prisma.contractor.update({ where: { id }, data });
    return NextResponse.json(c);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.$transaction([
        prisma.contractorPayment.deleteMany({ where: { contractorId: id } }),
        prisma.contractor.delete({ where: { id } }),
    ]);
    return NextResponse.json({ success: true });
});
