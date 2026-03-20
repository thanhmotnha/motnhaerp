import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { categoryUpdateSchema } from '@/lib/validations/productCategory';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const data = categoryUpdateSchema.parse(body);

    const oldCat = await prisma.productCategory.findUnique({ where: { id }, select: { name: true } });
    const cat = await prisma.productCategory.update({ where: { id }, data });

    // Sync product.category text field if name changed
    if (oldCat && data.name && data.name !== oldCat.name) {
        await prisma.product.updateMany({
            where: { categoryId: id },
            data: { category: data.name },
        });
    }

    return NextResponse.json(cat);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const cat = await prisma.productCategory.findUnique({ where: { id } });
    if (!cat) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Determine new parent category name for reparented products
    let parentCategoryName = '';
    if (cat.parentId) {
        const parent = await prisma.productCategory.findUnique({
            where: { id: cat.parentId },
            select: { name: true },
        });
        parentCategoryName = parent?.name || '';
    }

    await prisma.$transaction([
        // Reparent children
        prisma.productCategory.updateMany({
            where: { parentId: id },
            data: { parentId: cat.parentId },
        }),
        // Unlink products + sync category text field
        prisma.product.updateMany({
            where: { categoryId: id },
            data: {
                categoryId: cat.parentId,
                category: parentCategoryName || 'Chưa phân loại',
            },
        }),
        // Delete category
        prisma.productCategory.delete({ where: { id } }),
    ]);
    return NextResponse.json({ success: true });
});
