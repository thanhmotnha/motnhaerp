import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/activityLogger';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const ALLOWED_ROLES = ['giam_doc', 'ke_toan', 'ky_thuat'];

const patchSchema = z
    .object({
        unitPrice: z.number().nonnegative().optional(),
        quantity: z.number().nonnegative().optional(),
        budgetUnitPrice: z.number().nonnegative().optional(),
        category: z.string().optional(),
        notes: z.string().optional(),
        status: z.string().optional(),
    })
    .strict();

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { quantity, unitPrice, orderedQty, receivedQty, status, type, notes } = body;

    const update = {};
    if (quantity !== undefined) update.quantity = Number(quantity);
    if (unitPrice !== undefined) update.unitPrice = Number(unitPrice);
    if (orderedQty !== undefined) update.orderedQty = Number(orderedQty);
    if (receivedQty !== undefined) update.receivedQty = Number(receivedQty);
    if (status !== undefined) update.status = status;
    if (type !== undefined) update.type = type;
    if (notes !== undefined) update.notes = notes;

    // Recompute totalAmount when quantity or unitPrice changes
    if (quantity !== undefined || unitPrice !== undefined) {
        const current = await prisma.materialPlan.findUnique({ where: { id } });
        const q = quantity !== undefined ? Number(quantity) : current.quantity;
        const u = unitPrice !== undefined ? Number(unitPrice) : current.unitPrice;
        update.totalAmount = q * u;
    }

    const plan = await prisma.materialPlan.update({ where: { id }, data: update });
    return NextResponse.json(plan);
});

export const PATCH = withAuth(async (request, { params }, session) => {
    const { id } = await params;

    // Role guard
    if (!ALLOWED_ROLES.includes(session.user.role)) {
        return NextResponse.json(
            { error: 'Không có quyền chỉnh sửa hạng mục vật tư' },
            { status: 403 }
        );
    }

    const body = await request.json();
    const validated = patchSchema.parse(body);

    // Load current record to check lock + compute totalAmount
    const current = await prisma.materialPlan.findUnique({
        where: { id },
        include: { product: { select: { id: true, code: true, name: true, unit: true } } },
    });
    if (!current) {
        return NextResponse.json({ error: 'Không tìm thấy hạng mục' }, { status: 404 });
    }
    if (current.isLocked === true) {
        return NextResponse.json({ error: 'Hạng mục đã khóa' }, { status: 403 });
    }

    const update = { ...validated };

    // Recompute totalAmount if quantity or unitPrice changes
    if (validated.quantity !== undefined || validated.unitPrice !== undefined) {
        const q = validated.quantity !== undefined ? validated.quantity : current.quantity;
        const u = validated.unitPrice !== undefined ? validated.unitPrice : current.unitPrice;
        update.totalAmount = q * u;
    }

    const plan = await prisma.materialPlan.update({
        where: { id },
        data: update,
        include: { product: { select: { id: true, code: true, name: true, unit: true } } },
    });

    await logActivity({
        action: 'UPDATE',
        entityType: 'MaterialPlan',
        entityId: id,
        entityLabel: plan.product?.name || id,
        actor: session.user.name,
        actorId: session.user.id,
    });

    return NextResponse.json(plan);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.materialPlan.delete({ where: { id } });
    return NextResponse.json({ ok: true });
});
