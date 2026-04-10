import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const MATERIAL_TYPES = ['VAN', 'NEP', 'ACRYLIC'];

export const GET = withAuth(async (_req, { params }) => {
    const { id } = await params;
    const orders = await prisma.furnitureMaterialOrder.findMany({
        where: { furnitureOrderId: id },
        include: {
            items: true,
            purchaseOrder: { select: { id: true, code: true, status: true, supplier: true } },
        },
        orderBy: { materialType: 'asc' },
    });

    const result = {};
    for (const type of MATERIAL_TYPES) {
        result[type] = orders.find(o => o.materialType === type) || {
            id: null,
            furnitureOrderId: id,
            materialType: type,
            purchaseOrderId: null,
            status: 'DRAFT',
            items: [],
            purchaseOrder: null,
        };
    }
    return NextResponse.json(result);
});
