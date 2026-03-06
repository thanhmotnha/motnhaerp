import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST — create a new MaterialSelection round with items
export const POST = withAuth(async (req, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const { title = '', notes = '', items = [] } = body;

    const lastSel = await prisma.materialSelection.findFirst({
        where: { furnitureOrderId: id },
        orderBy: { selectionRound: 'desc' },
        select: { selectionRound: true },
    });
    const selectionRound = (lastSel?.selectionRound || 0) + 1;

    const selection = await prisma.materialSelection.create({
        data: {
            furnitureOrderId: id,
            selectionRound,
            title,
            notes,
            items: {
                create: items.map(item => ({
                    materialName: item.materialName || '',
                    materialCode: item.materialCode || '',
                    applicationArea: item.applicationArea || '',
                    colorName: item.colorName || '',
                    colorCode: item.colorCode || '',
                    finishType: item.finishType || '',
                    supplier: item.supplier || '',
                    quantity: Number(item.quantity) || 0,
                    unit: item.unit || '',
                    unitPrice: Number(item.unitPrice) || 0,
                    notes: item.notes || '',
                    productId: item.productId || null,
                })),
            },
        },
        include: { items: { include: { product: { select: { id: true, name: true, code: true } } } } },
    });

    return NextResponse.json(selection, { status: 201 });
});

// PUT — update MaterialSelection status (confirm / change)
export const PUT = withAuth(async (req, { params }) => {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const selectionId = searchParams.get('selectionId');
    if (!selectionId) return NextResponse.json({ error: 'selectionId required' }, { status: 400 });

    const body = await req.json();
    const data = {};
    if (body.status) data.status = body.status;
    if (body.confirmedByName !== undefined) data.confirmedByName = body.confirmedByName;
    if (body.confirmationNote !== undefined) data.confirmationNote = body.confirmationNote;
    if (body.status === 'confirmed') data.confirmedAt = new Date();

    const selection = await prisma.materialSelection.update({ where: { id: selectionId }, data });
    return NextResponse.json(selection);
});
