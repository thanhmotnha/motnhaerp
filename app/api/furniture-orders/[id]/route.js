import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/activityLog';

const INCLUDE_DETAIL = {
    customer: { select: { id: true, name: true, phone: true, code: true } },
    project:  { select: { id: true, code: true, name: true, phase: true, siteReadyFlag: true, status: true } },
    quotation: { select: { id: true, code: true, grandTotal: true, status: true } },
    contract:  { select: { id: true, code: true, contractValue: true, paidAmount: true, status: true } },
    items: { orderBy: { sortOrder: 'asc' } },
    designs: { orderBy: { versionNumber: 'desc' } },
    materialSelections: { include: { items: { include: { product: { select: { id: true, name: true, code: true } } } } }, orderBy: { selectionRound: 'desc' } },
    batches: {
        include: {
            workshop: true,
            batchItems: { include: { furnitureOrderItem: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
    },
    payments: { orderBy: { paidAt: 'desc' } },
    warrantyTickets: { orderBy: { createdAt: 'desc' } },
};

// GET detail
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const order = await prisma.furnitureOrder.findUniqueOrThrow({ where: { id }, include: INCLUDE_DETAIL });
    return NextResponse.json(order);
});

// PUT update
export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json();

    const {
        name, description, styleNote, roomType, deliveryAddress, internalNote,
        salesperson, designer, expectedDelivery, status,
        depositAmount, paidAmount,
        publicToken, tokenExpiresAt,
    } = body;

    const existing = await prisma.furnitureOrder.findUniqueOrThrow({ where: { id } });

    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (styleNote !== undefined) data.styleNote = styleNote;
    if (roomType !== undefined) data.roomType = roomType;
    if (deliveryAddress !== undefined) data.deliveryAddress = deliveryAddress;
    if (internalNote !== undefined) data.internalNote = internalNote;
    if (salesperson !== undefined) data.salesperson = salesperson;
    if (designer !== undefined) data.designer = designer;
    if (expectedDelivery !== undefined) data.expectedDelivery = expectedDelivery ? new Date(expectedDelivery) : null;
    if (status !== undefined) data.status = status;
    if (depositAmount !== undefined) data.depositAmount = depositAmount;
    if (paidAmount !== undefined) data.paidAmount = paidAmount;
    if (publicToken !== undefined) data.publicToken = publicToken;
    if (tokenExpiresAt !== undefined) data.tokenExpiresAt = tokenExpiresAt ? new Date(tokenExpiresAt) : null;

    const order = await prisma.furnitureOrder.update({ where: { id }, data, include: INCLUDE_DETAIL });

    logActivity({
        actor: session?.user?.name || '',
        action: 'UPDATE',
        entityType: 'FurnitureOrder',
        entityId: id,
        entityLabel: `${order.code} — ${order.name}`,
        diff: { from: { status: existing.status }, to: { status: order.status } },
    });

    return NextResponse.json(order);
});

// DELETE — soft delete via status=cancelled
export const DELETE = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const order = await prisma.furnitureOrder.findUniqueOrThrow({ where: { id } });

    // Only allow cancel if no batch is in_progress
    const activeBatch = await prisma.productionBatch.findFirst({
        where: { furnitureOrderId: id, status: 'in_progress' },
    });
    if (activeBatch) {
        return NextResponse.json({ error: 'Không thể hủy đơn khi đang có lệnh sản xuất đang chạy' }, { status: 400 });
    }

    await prisma.furnitureOrder.update({ where: { id }, data: { status: 'cancelled' } });

    logActivity({
        actor: session?.user?.name || '',
        action: 'DELETE',
        entityType: 'FurnitureOrder',
        entityId: id,
        entityLabel: `${order.code} — ${order.name}`,
    });

    return NextResponse.json({ success: true });
}, { roles: ['giam_doc', 'pho_gd', 'quan_ly_du_an'] });
