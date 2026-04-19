import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/inventory/reorder-alerts — Products dưới ngưỡng reorder
export const GET = withAuth(async () => {
    const products = await prisma.product.findMany({
        where: {
            reorderPoint: { gt: 0 },
            deletedAt: null,
        },
        orderBy: { stock: 'asc' },
    });

    const needReorder = products.filter(p => p.stock <= p.reorderPoint);
    return NextResponse.json(needReorder);
}, { roles: ['giam_doc', 'ke_toan', 'kho', 'ky_thuat'] });
