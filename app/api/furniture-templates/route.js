import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generateCode } from '@/lib/generateCode';

// GET list templates
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const active = searchParams.get('active');

    const where = {};
    if (category) where.category = category;
    if (active !== null) where.isActive = active !== 'false';

    const templates = await prisma.furnitureTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
    });

    // Parse JSON fields
    const parsed = templates.map(t => ({
        ...t,
        items: JSON.parse(t.items || '[]'),
        materials: JSON.parse(t.materials || '[]'),
    }));

    return NextResponse.json(parsed);
});

// POST create template
export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { name, description, category, roomType, styleNote, items, materials } = body;

    if (!name?.trim()) return NextResponse.json({ error: 'Tên mẫu là bắt buộc' }, { status: 400 });

    const code = await generateCode('furnitureTemplate', 'TML');

    const template = await prisma.furnitureTemplate.create({
        data: {
            code,
            name: name.trim(),
            description: description || '',
            category: category || '',
            roomType: roomType || '',
            styleNote: styleNote || '',
            items: JSON.stringify(items || []),
            materials: JSON.stringify(materials || []),
        },
    });

    return NextResponse.json({
        ...template,
        items: JSON.parse(template.items),
        materials: JSON.parse(template.materials),
    }, { status: 201 });
}, { roles: ['giam_doc', 'pho_gd', 'quan_ly_du_an'] });
