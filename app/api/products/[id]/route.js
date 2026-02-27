import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
    const { id } = await params;
    const data = await request.json();
    const product = await prisma.product.update({ where: { id }, data });
    return NextResponse.json(product);
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        // Xóa tất cả FK references trước
        await prisma.inventoryTransaction.deleteMany({ where: { productId: id } });
        await prisma.materialPlan.deleteMany({ where: { productId: id } });
        await prisma.quotationItem.updateMany({ where: { productId: id }, data: { productId: null } });
        await prisma.product.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Delete product error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
