import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { productUpdateSchema } from '@/lib/validations/product';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(product);
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const data = productUpdateSchema.parse(body);

    // Auto-sync category text when categoryId changes
    if (data.categoryId) {
        const cat = await prisma.productCategory.findUnique({ where: { id: data.categoryId }, select: { name: true } });
        if (cat) data.category = cat.name;
    }

    const product = await prisma.product.update({ where: { id }, data });
    return NextResponse.json(product);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.product.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'Ngừng kinh doanh' },
    });
    return NextResponse.json({ success: true });
});
