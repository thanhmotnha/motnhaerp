import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/activityLog';

// POST add item to order
export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json();
    const { name, unit, quantity, unitPrice, description, specs,
            quotationItemId, productId, expectedDate, notes, sortOrder } = body;

    if (!name) return NextResponse.json({ error: 'Thiếu tên hạng mục' }, { status: 400 });

    const amount = (quantity || 1) * (unitPrice || 0);

    const [item] = await prisma.$transaction([
        prisma.furnitureOrderItem.create({
            data: {
                furnitureOrderId: id,
                sortOrder: sortOrder ?? 0,
                quotationItemId: quotationItemId || null,
                productId: productId || null,
                name,
                description: description || '',
                unit: unit || 'bộ',
                quantity: quantity || 1,
                unitPrice: unitPrice || 0,
                amount,
                specs: specs || null,
                expectedDate: expectedDate ? new Date(expectedDate) : null,
                notes: notes || '',
            },
        }),
        prisma.furnitureOrder.update({
            where: { id },
            data: { confirmedAmount: { increment: amount } },
        }),
    ]);

    logActivity({ actor: session?.user?.name || '', action: 'CREATE', entityType: 'FurnitureOrderItem', entityId: item.id, entityLabel: name });
    return NextResponse.json(item, { status: 201 });
});

// PUT update or cancel item: /api/furniture-orders/[id]/items?itemId=xxx
export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    if (!itemId) return NextResponse.json({ error: 'Thiếu itemId' }, { status: 400 });

    const body = await request.json();
    const { status, cancelReason, name, unit, quantity, unitPrice, specs, notes } = body;

    const existing = await prisma.furnitureOrderItem.findUniqueOrThrow({ where: { id: itemId } });

    // BR-006: cancel after production started needs pho_gd+
    if (status === 'cancelled' && existing.status === 'in_production') {
        const userRole = session?.user?.role;
        if (!['giam_doc', 'pho_gd'].includes(userRole)) {
            return NextResponse.json({ error: 'Cần quyền Phó GĐ trở lên để hủy món đang sản xuất' }, { status: 403 });
        }
    }

    const newAmount = quantity !== undefined && unitPrice !== undefined
        ? quantity * unitPrice
        : existing.amount;

    const amountDelta = newAmount - existing.amount;
    const isCancelling = status === 'cancelled' && existing.status !== 'cancelled';
    const isRestoring  = existing.status === 'cancelled' && status && status !== 'cancelled';

    const data = {};
    if (name !== undefined) data.name = name;
    if (unit !== undefined) data.unit = unit;
    if (quantity !== undefined) data.quantity = quantity;
    if (unitPrice !== undefined) data.unitPrice = unitPrice;
    if (quantity !== undefined || unitPrice !== undefined) data.amount = newAmount;
    if (specs !== undefined) data.specs = specs;
    if (notes !== undefined) data.notes = notes;
    if (status !== undefined) data.status = status;
    if (cancelReason !== undefined) data.cancelReason = cancelReason;

    const ops = [prisma.furnitureOrderItem.update({ where: { id: itemId }, data })];

    if (isCancelling) {
        ops.push(prisma.furnitureOrder.update({
            where: { id },
            data: {
                confirmedAmount: { decrement: existing.amount },
                cancelledAmount: { increment: existing.amount },
            },
        }));
    } else if (isRestoring) {
        ops.push(prisma.furnitureOrder.update({
            where: { id },
            data: {
                confirmedAmount: { increment: existing.amount },
                cancelledAmount: { decrement: existing.amount },
            },
        }));
    } else if (amountDelta !== 0) {
        ops.push(prisma.furnitureOrder.update({
            where: { id },
            data: { confirmedAmount: { increment: amountDelta } },
        }));
    }

    const [item] = await prisma.$transaction(ops);
    logActivity({ actor: session?.user?.name || '', action: 'UPDATE', entityType: 'FurnitureOrderItem', entityId: itemId, entityLabel: existing.name });
    return NextResponse.json(item);
});
