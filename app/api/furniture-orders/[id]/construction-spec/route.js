import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/furniture-orders/[id]/construction-spec
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const order = await prisma.furnitureOrder.findUnique({
        where: { id },
        select: { constructionSpec: true },
    });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json(order.constructionSpec || {});
});

// PUT /api/furniture-orders/[id]/construction-spec
// Body: { vanColor, vanColorCode, acrylic, nep, handleType, hinge, rail, accessories, notes }
export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const order = await prisma.furnitureOrder.update({
        where: { id },
        data: { constructionSpec: body },
        select: { constructionSpec: true },
    });
    return NextResponse.json(order.constructionSpec);
});
