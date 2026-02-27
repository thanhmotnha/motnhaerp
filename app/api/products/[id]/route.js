import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { productUpdateSchema } from '@/lib/validations/product';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const data = productUpdateSchema.parse(body);
    const product = await prisma.product.update({ where: { id }, data });
    return NextResponse.json(product);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.$transaction([
        prisma.inventoryTransaction.deleteMany({ where: { productId: id } }),
        prisma.materialPlan.deleteMany({ where: { productId: id } }),
        prisma.quotationItem.updateMany({ where: { productId: id }, data: { productId: null } }),
        prisma.product.delete({ where: { id } }),
    ]);
    return NextResponse.json({ success: true });
});
