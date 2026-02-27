import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const where = {};
    if (status) where.status = status;

    const quotations = await prisma.quotation.findMany({
        where,
        include: {
            customer: { select: { name: true } },
            project: { select: { name: true } },
            categories: { include: { items: true }, orderBy: { order: 'asc' } },
            items: true,
            _count: { select: { contracts: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(quotations);
}

export async function POST(request) {
    try {
        const { categories, ...rawData } = await request.json();
        const last = await prisma.quotation.findFirst({ orderBy: { code: 'desc' } });
        const lastNum = last ? parseInt(last.code.replace(/\D/g, ''), 10) || 0 : 0;
        const code = `BG${String(lastNum + 1).padStart(3, '0')}`;

        // Whitelist + ép kiểu để tránh "Invalid invocation"
        const data = {
            code,
            customerId: rawData.customerId,
            projectId: rawData.projectId || null,
            type: rawData.type || 'Thi công thô',
            notes: rawData.notes || '',
            status: rawData.status || 'Nháp',
            vat: Number(rawData.vat) || 10,
            discount: Number(rawData.discount) || 0,
            managementFeeRate: Number(rawData.managementFeeRate) || 5,
            managementFee: Number(rawData.managementFee) || 0,
            designFee: Number(rawData.designFee) || 0,
            otherFee: Number(rawData.otherFee) || 0,
            directCost: Number(rawData.directCost) || 0,
            total: Number(rawData.total) || 0,
            grandTotal: Number(rawData.grandTotal) || 0,
        };

        // Step 1: Create quotation without nested items
        const quotation = await prisma.quotation.create({ data });

        // Step 2: Create categories + items with explicit quotationId
        if (categories && categories.length > 0) {
            for (let ci = 0; ci < categories.length; ci++) {
                const cat = categories[ci];
                const createdCat = await prisma.quotationCategory.create({
                    data: {
                        name: cat.name || '',
                        order: ci,
                        subtotal: cat.subtotal || 0,
                        quotationId: quotation.id,
                    },
                });
                if (cat.items && cat.items.length > 0) {
                    await prisma.quotationItem.createMany({
                        data: cat.items.map((item, ii) => ({
                            name: item.name || '',
                            order: ii,
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
                            categoryId: createdCat.id,
                            quotationId: quotation.id,
                        })),
                    });
                }
            }
        }

        const result = await prisma.quotation.findUnique({
            where: { id: quotation.id },
            include: {
                categories: { include: { items: true }, orderBy: { order: 'asc' } },
                items: true,
            },
        });
        return NextResponse.json(result, { status: 201 });
    } catch (e) {
        console.error('POST /api/quotations error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
