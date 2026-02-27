import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const { id } = await params;
    const quotation = await prisma.quotation.findUnique({
        where: { id },
        include: {
            customer: true,
            project: true,
            categories: {
                include: { items: true },
                orderBy: { order: 'asc' },
            },
            items: true,
        },
    });
    if (!quotation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(quotation);
}

export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const { categories, ...rawData } = await request.json();

        // Sanitize: chỉ lấy các field hợp lệ của Quotation, tránh Prisma error
        const ALLOWED = ['customerId', 'projectId', 'type', 'notes', 'status', 'validUntil',
            'vat', 'discount', 'managementFeeRate', 'managementFee', 'designFee', 'otherFee',
            'adjustment', 'adjustmentType', 'adjustmentAmount',
            'directCost', 'total', 'grandTotal'];
        const data = {};
        for (const key of ALLOWED) {
            if (key in rawData) data[key] = rawData[key];
        }
        // projectId: "" → null để tránh FK error
        if (!data.projectId) data.projectId = null;

        // Delete old categories & items if rebuilding
        if (categories !== undefined) {
            await prisma.quotationItem.deleteMany({ where: { quotationId: id } });
            await prisma.quotationCategory.deleteMany({ where: { quotationId: id } });
        }

        // Update quotation fields
        await prisma.quotation.update({ where: { id }, data });

        // Recreate categories + items
        if (categories) {
            for (let ci = 0; ci < categories.length; ci++) {
                const cat = categories[ci];
                const created = await prisma.quotationCategory.create({
                    data: {
                        name: cat.name || '',
                        order: ci,
                        subtotal: cat.subtotal || 0,
                        quotationId: id,
                    },
                });
                if (cat.items && cat.items.length > 0) {
                    await prisma.quotationItem.createMany({
                        data: cat.items.map((item, ii) => ({
                            name: item.name || '',
                            order: item.order ?? ii,
                            unit: item.unit || '',
                            quantity: Number(item.quantity) || 0,
                            mainMaterial: Number(item.mainMaterial) || 0,
                            auxMaterial: Number(item.auxMaterial) || 0,
                            labor: Number(item.labor) || 0,
                            unitPrice: Number(item.unitPrice) || 0,
                            amount: Number(item.amount) || 0,
                            description: item.description || '',
                            length: Number(item.length) || 0,
                            width: Number(item.width) || 0,
                            height: Number(item.height) || 0,
                            image: item.image || '',
                            productId: item.productId || null,
                            quotationId: id,
                            categoryId: created.id,
                        })),
                    });
                }
            }
        }

        const result = await prisma.quotation.findUnique({
            where: { id },
            include: {
                customer: true,
                project: true,
                categories: { include: { items: true }, orderBy: { order: 'asc' } },
                items: true,
            },
        });
        return NextResponse.json(result);
    } catch (e) {
        console.error('PUT /api/quotations/[id] error:', e.message, e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        await prisma.quotationItem.deleteMany({ where: { quotationId: id } });
        await prisma.quotationCategory.deleteMany({ where: { quotationId: id } });
        await prisma.quotation.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
