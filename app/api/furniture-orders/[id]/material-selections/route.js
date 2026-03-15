import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_req, { params }) => {
    const { id } = await params;
    const selections = await prisma.materialSelection.findMany({
        where: { furnitureOrderId: id },
        include: { items: true },
        orderBy: { selectionRound: 'desc' },
    });
    return NextResponse.json(selections);
});

export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const maxRound = await prisma.materialSelection.aggregate({
        where: { furnitureOrderId: id },
        _max: { selectionRound: true },
    });
    const selection = await prisma.materialSelection.create({
        data: {
            furnitureOrderId: id,
            selectionRound: (maxRound._max.selectionRound || 0) + 1,
            title: body.title || '',
            notes: body.notes || '',
            presentedBy: body.presentedBy || '',
            presentedAt: body.presentedAt ? new Date(body.presentedAt) : null,
            items: body.items?.length > 0 ? {
                create: body.items.map(it => ({
                    productId: it.productId || null,
                    materialName: it.materialName || '',
                    materialCode: it.materialCode || '',
                    colorName: it.colorName || '',
                    colorCode: it.colorCode || '',
                    finishType: it.finishType || '',
                    supplier: it.supplier || '',
                    swatchImageUrl: it.swatchImageUrl || '',
                    applicationArea: it.applicationArea || '',
                    quantity: it.quantity || 0,
                    unit: it.unit || '',
                    unitPrice: it.unitPrice || 0,
                    notes: it.notes || '',
                })),
            } : undefined,
        },
        include: { items: true },
    });
    return NextResponse.json(selection, { status: 201 });
});
