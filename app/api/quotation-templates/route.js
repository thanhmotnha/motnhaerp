import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const templates = await prisma.quotationTemplate.findMany({
            include: { categories: { include: { items: true }, orderBy: { order: 'asc' } } },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(templates);
    } catch (e) {
        console.error('QuotationTemplate GET error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { categories, ...data } = await request.json();

        const template = await prisma.quotationTemplate.create({
            data: {
                ...data,
                categories: categories ? {
                    create: categories.map((cat, ci) => ({
                        name: cat.name,
                        order: ci,
                        items: {
                            create: (cat.items || []).map((item, ii) => ({
                                name: item.name,
                                order: ii,
                                unit: item.unit || '',
                                quantity: item.quantity || 0,
                                mainMaterial: item.mainMaterial || 0,
                                auxMaterial: item.auxMaterial || 0,
                                labor: item.labor || 0,
                                unitPrice: item.unitPrice || 0,
                                description: item.description || '',
                            })),
                        },
                    })),
                } : undefined,
            },
            include: { categories: { include: { items: true }, orderBy: { order: 'asc' } } },
        });
        return NextResponse.json(template, { status: 201 });
    } catch (e) {
        console.error('QuotationTemplate POST error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
