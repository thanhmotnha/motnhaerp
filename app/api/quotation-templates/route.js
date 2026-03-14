import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const where = { isActive: true };
    if (search) {
        where.name = { contains: search, mode: 'insensitive' };
    }

    const templates = await prisma.quotationTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
    });

    // Parse categories JSON
    const result = templates.map(t => ({
        ...t,
        categories: JSON.parse(t.categories || '[]'),
    }));

    return NextResponse.json(result);
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { name, type, categories } = body;

    if (!name) {
        return NextResponse.json({ error: 'Tên mẫu không được để trống' }, { status: 400 });
    }

    const template = await prisma.quotationTemplate.create({
        data: {
            name: name.trim(),
            type: type || '',
            categories: JSON.stringify(categories || []),
        },
    });

    return NextResponse.json({
        ...template,
        categories: JSON.parse(template.categories || '[]'),
    }, { status: 201 });
});
