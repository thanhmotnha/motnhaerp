import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { products } = body;

    if (!Array.isArray(products) || products.length === 0) {
        return NextResponse.json({ error: 'No products provided' }, { status: 400 });
    }

    if (products.length > 100) {
        return NextResponse.json({ error: 'Tối đa 100 sản phẩm mỗi lần' }, { status: 400 });
    }

    const created = [];

    // Sequential to guarantee unique codes
    for (const p of products) {
        try {
            const code = await generateCode('product', 'SP');
            let categoryId = null;

            if (p.category) {
                const cat = await prisma.productCategory.findFirst({ where: { name: p.category } });
                if (cat) categoryId = cat.id;
            }

            const newProduct = await prisma.product.create({
                data: {
                    code,
                    name: p.name,
                    unit: p.unit || 'cái',
                    category: p.category || 'Khác',
                    categoryId,
                    importPrice: p.importPrice || 0,
                    salePrice: p.salePrice || p.importPrice || 0,
                    stock: 0,
                    minStock: 0,
                    status: 'Đang kinh doanh',
                    supplyType: 'Có sẵn',
                },
                select: { id: true, name: true }
            });
            created.push(newProduct);
        } catch (e) {
            console.error('Error creating product in batch:', p.name, e);
        }
    }

    return NextResponse.json({ created });
});
