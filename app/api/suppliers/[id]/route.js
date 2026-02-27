import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const { id } = await params;
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(supplier);
}

export async function PUT(request, { params }) {
    const { id } = await params;
    const data = await request.json();
    const updated = await prisma.supplier.update({ where: { id }, data });
    return NextResponse.json(updated);
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        await prisma.supplier.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
