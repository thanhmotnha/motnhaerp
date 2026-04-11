import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_req, { params }) => {
    const { id } = await params;
    const order = await prisma.furnitureOrder.findUnique({
        where: { id },
        include: {
            customer: { select: { id: true, name: true, phone: true, email: true } },
            project: { select: { id: true, code: true, name: true } },
            quotation: { select: { id: true, code: true, grandTotal: true } },
            contract: { select: { id: true, code: true, status: true } },
            items: { orderBy: { sortOrder: 'asc' }, include: { product: { select: { id: true, code: true, name: true } } } },
            designs: { orderBy: { versionNumber: 'desc' } },
            materialSelections: { include: { items: true }, orderBy: { selectionRound: 'desc' } },
            materialOrders: true,
            batches: { include: { workshop: { select: { id: true, code: true, name: true } }, batchItems: true }, orderBy: { createdAt: 'desc' } },
            payments: { orderBy: { paidAt: 'desc' } },
        },
    });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json(order);
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    // Không cho cập nhật items qua đây, dùng sub-route
    const { items, designs, materialSelections, batches, payments, ...headerData } = body;
    if (headerData.expectedDelivery) headerData.expectedDelivery = new Date(headerData.expectedDelivery);
    if (headerData.deliveredAt) headerData.deliveredAt = new Date(headerData.deliveredAt);
    const order = await prisma.furnitureOrder.update({ where: { id }, data: headerData });
    return NextResponse.json(order);
});

export const DELETE = withAuth(async (_req, { params }) => {
    const { id } = await params;
    await prisma.furnitureOrder.update({ where: { id }, data: { status: 'cancelled' } });
    return NextResponse.json({ success: true });
});
