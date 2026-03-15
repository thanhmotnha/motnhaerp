import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const category = searchParams.get('category');

    const where = { isActive: true };
    if (category) where.category = category;

    const [data, total] = await Promise.all([
        prisma.furnitureTemplate.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.furnitureTemplate.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(data, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const existing = body.code ? await prisma.furnitureTemplate.findUnique({ where: { code: body.code } }) : null;
    if (existing) return NextResponse.json({ error: 'Mã mẫu đã tồn tại' }, { status: 400 });
    const tpl = await prisma.furnitureTemplate.create({
        data: {
            code: body.code, name: body.name, description: body.description || '',
            category: body.category || '', roomType: body.roomType || '', styleNote: body.styleNote || '',
            items: body.items || '[]', materials: body.materials || '[]',
        },
    });
    return NextResponse.json(tpl, { status: 201 });
});
