import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_req, { params }) => {
    const { selId } = await params;
    const sel = await prisma.materialSelection.findUnique({
        where: { id: selId },
        include: { items: true },
    });
    if (!sel) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json(sel);
});

export const PUT = withAuth(async (request, { params }) => {
    const { selId } = await params;
    const body = await request.json();
    const updateData = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.notes !== undefined) updateData.notes = body.notes;

    if (body.status === 'confirmed') {
        updateData.status = 'confirmed';
        updateData.confirmedAt = new Date();
        updateData.confirmedByName = body.confirmedByName || '';
        updateData.confirmedIp = body.confirmedIp || '';
        updateData.confirmationNote = body.confirmationNote || '';
    } else if (body.status === 'changed') {
        updateData.status = 'changed';
    }

    const sel = await prisma.materialSelection.update({
        where: { id: selId },
        data: updateData,
        include: { items: true },
    });
    return NextResponse.json(sel);
});

// PATCH /api/furniture-orders/[id]/material-selections/[selId]
// Body: { title?, presentedBy?, notes?, items?: [...] }
// Replaces all items when items array is provided
export const PATCH = withAuth(async (request, { params }) => {
    const { selId } = await params;
    const body = await request.json();

    if (body.items !== undefined) {
        await prisma.materialSelectionItem.deleteMany({ where: { materialSelectionId: selId } });
        if (body.items.length > 0) {
            await prisma.materialSelectionItem.createMany({
                data: body.items.map(it => ({
                    materialSelectionId: selId,
                    productId: it.productId || null,
                    materialName: it.materialName || '',
                    materialCode: it.materialCode || '',
                    colorName: it.colorName || '',
                    colorCode: it.colorCode || '',
                    finishType: it.finishType || '',
                    supplier: it.supplier || '',
                    swatchImageUrl: it.swatchImageUrl || '',
                    applicationArea: it.applicationArea || '',
                    quantity: Number(it.quantity) || 0,
                    unit: it.unit || '',
                    unitPrice: Number(it.unitPrice) || 0,
                    notes: it.notes || '',
                })),
            });
        }
    }

    const updateData = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.presentedBy !== undefined) updateData.presentedBy = body.presentedBy;

    const sel = await prisma.materialSelection.update({
        where: { id: selId },
        data: updateData,
        include: { items: true },
    });
    return NextResponse.json(sel);
});

export const DELETE = withAuth(async (_req, { params }) => {
    const { selId } = await params;
    await prisma.materialSelection.delete({ where: { id: selId } });
    return NextResponse.json({ success: true });
});
