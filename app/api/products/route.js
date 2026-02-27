import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const where = {};
    if (category) where.category = category;
    if (search) where.name = { contains: search };

    const products = await prisma.product.findMany({ where, orderBy: { createdAt: 'desc' } });
    return NextResponse.json(products);
}

export async function POST(request) {
    try {
        const data = await request.json();
        if (!data.name?.trim()) return NextResponse.json({ error: 'Tên SP bắt buộc' }, { status: 400 });
        const code = await generateCode('product', 'SP');
        const product = await prisma.product.create({
            data: {
                code,
                name: data.name.trim(),
                category: data.category || 'Vật liệu',
                unit: data.unit || 'Cái',
                importPrice: Number(data.importPrice) || 0,
                salePrice: Number(data.salePrice) || 0,
                stock: Number(data.stock) || 0,
                minStock: Number(data.minStock) || 0,
                supplier: data.supplier || '',
                description: data.description || '',
                dimensions: data.dimensions || '',
                weight: Number(data.weight) || 0,
                color: data.color || '',
                material: data.material || '',
                origin: data.origin || '',
                warranty: data.warranty || '',
                brand: data.brand || '',
                status: data.status || 'Đang bán',
                location: data.location || '',
                image: data.image || '',
            },
        });
        return NextResponse.json(product, { status: 201 });
    } catch (e) {
        console.error('Create product error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
export async function PATCH(request) {
    try {
        const { oldCategory, newCategory } = await request.json();
        if (!oldCategory || !newCategory?.trim()) return NextResponse.json({ error: 'Thiếu tên danh mục' }, { status: 400 });
        const result = await prisma.product.updateMany({
            where: { category: oldCategory },
            data: { category: newCategory.trim() },
        });
        return NextResponse.json({ updated: result.count });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
