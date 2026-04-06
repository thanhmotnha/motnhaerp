import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;

    const quotation = await prisma.quotation.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, code: true, projectId: true },
    });
    if (!quotation) return NextResponse.json({ error: 'Không tìm thấy báo giá' }, { status: 404 });

    const items = await prisma.quotationItem.findMany({
        where: {
            quotationId: id,
            productId: { not: null },
            parentItemId: null,
        },
        select: {
            id: true,
            name: true,
            productId: true,
            unit: true,
            quantity: true,
            volume: true,
            unitPrice: true,
            product: { select: { name: true, unit: true } },
        },
        orderBy: { order: 'asc' },
    });

    const result = items.map(item => ({
        id: item.id,
        name: item.name || item.product?.name || '',
        productId: item.productId,
        unit: item.unit || item.product?.unit || '',
        quantity: (item.quantity > 0 ? item.quantity : item.volume) || 1,
        unitPrice: item.unitPrice || 0,
    }));

    return NextResponse.json({ quotation, items: result });
});
