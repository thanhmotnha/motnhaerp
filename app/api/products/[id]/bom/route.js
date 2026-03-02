import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const bom = await prisma.productBOM.findMany({
        where: { productId: id },
        include: {
            component: { select: { id: true, code: true, name: true, unit: true, category: true, image: true } },
        },
        orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(bom);
});

export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { componentId, quantity, unit, notes } = await request.json();
    if (!componentId) return NextResponse.json({ error: 'Thiếu vật tư thành phần' }, { status: 400 });
    if (componentId === id) return NextResponse.json({ error: 'Không thể thêm sản phẩm vào chính nó' }, { status: 400 });
    const item = await prisma.productBOM.create({
        data: { productId: id, componentId, quantity: quantity || 1, unit: unit || '', notes: notes || '' },
        include: {
            component: { select: { id: true, code: true, name: true, unit: true, category: true, image: true } },
        },
    });
    return NextResponse.json(item, { status: 201 });
});
