import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { furnitureMaterialOrderUpdateSchema } from '@/lib/validations/furnitureMaterialOrder';
import { NextResponse } from 'next/server';

const VALID_TYPES = ['VAN', 'NEP', 'ACRYLIC'];

export const GET = withAuth(async (_req, { params }) => {
    const { id, type } = await params;
    if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: 'Loại không hợp lệ' }, { status: 400 });

    const order = await prisma.furnitureMaterialOrder.findUnique({
        where: { furnitureOrderId_materialType: { furnitureOrderId: id, materialType: type } },
        include: {
            items: true,
            purchaseOrder: { select: { id: true, code: true, status: true, supplier: true } },
        },
    });
    return NextResponse.json(order || { id: null, materialType: type, status: 'DRAFT', items: [], purchaseOrder: null });
});

export const PUT = withAuth(async (request, { params }) => {
    const { id, type } = await params;
    if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: 'Loại không hợp lệ' }, { status: 400 });

    const body = await request.json();
    const { items } = furnitureMaterialOrderUpdateSchema.parse(body);

    const existing = await prisma.furnitureMaterialOrder.findUnique({
        where: { furnitureOrderId_materialType: { furnitureOrderId: id, materialType: type } },
    });

    let materialOrder;
    if (existing) {
        materialOrder = await prisma.$transaction(async (tx) => {
            await tx.furnitureMaterialOrderItem.deleteMany({ where: { furnitureMaterialOrderId: existing.id } });
            return tx.furnitureMaterialOrder.update({
                where: { id: existing.id },
                data: { items: { create: items } },
                include: { items: true },
            });
        });
    } else {
        materialOrder = await prisma.furnitureMaterialOrder.create({
            data: {
                furnitureOrderId: id,
                materialType: type,
                items: { create: items },
            },
            include: { items: true },
        });
    }
    return NextResponse.json(materialOrder);
});
