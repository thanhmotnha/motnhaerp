import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') !== '0';

    const where = {};
    if (activeOnly) where.isActive = true;

    const categories = await prisma.expenseCategory.findMany({
        where,
        include: { children: { where: activeOnly ? { isActive: true } : {} } },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(categories);
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { name, code, description, parentId, linkType, sortOrder } = body;
    if (!name || !code) return NextResponse.json({ error: 'name và code bắt buộc' }, { status: 400 });

    const exists = await prisma.expenseCategory.findFirst({ where: { OR: [{ name }, { code }] } });
    if (exists) return NextResponse.json({ error: 'Tên hoặc mã đã tồn tại' }, { status: 409 });

    const cat = await prisma.expenseCategory.create({
        data: {
            name: name.trim(),
            code: code.trim().toUpperCase(),
            description: description || '',
            parentId: parentId || null,
            linkType: linkType || '',
            sortOrder: Number(sortOrder) || 0,
        },
    });

    return NextResponse.json(cat, { status: 201 });
});
