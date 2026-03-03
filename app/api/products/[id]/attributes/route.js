import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const attributes = await prisma.productAttribute.findMany({
        where: { productId: id },
        include: { options: { orderBy: { order: 'asc' } } },
        orderBy: { order: 'asc' },
    });
    return NextResponse.json(attributes);
});

export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { name, inputType = 'select', required = true, order = 0 } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Tên thuộc tính bắt buộc' }, { status: 400 });
    const attribute = await prisma.productAttribute.create({
        data: { productId: id, name: name.trim(), inputType, required, order },
        include: { options: true },
    });
    return NextResponse.json(attribute, { status: 201 });
});
