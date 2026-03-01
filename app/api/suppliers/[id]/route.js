import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { supplierUpdateSchema } from '@/lib/validations/supplier';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(supplier);
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const data = supplierUpdateSchema.parse(body);
    const updated = await prisma.supplier.update({ where: { id }, data });
    return NextResponse.json(updated);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.supplier.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
