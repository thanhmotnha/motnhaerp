import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/apiHandler';

export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const where = type ? { type } : {};

    const templates = await prisma.contractTemplate.findMany({
        where,
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
    return NextResponse.json(templates);
});

export const POST = withAuth(async (req) => {
    const body = await req.json();
    const { name, type, body: templateBody, isDefault } = body;
    if (!name?.trim()) return NextResponse.json({ error: 'Tên mẫu không được trống' }, { status: 400 });

    // If setting as default, unset other defaults of same type
    if (isDefault) {
        await prisma.contractTemplate.updateMany({
            where: { type: type || 'Thi công', isDefault: true },
            data: { isDefault: false },
        });
    }

    const template = await prisma.contractTemplate.create({
        data: {
            name: name.trim(),
            type: type || 'Thi công',
            body: templateBody || '',
            isDefault: !!isDefault,
        },
    });
    return NextResponse.json(template, { status: 201 });
}, { roles: ['giam_doc', 'pho_gd'] });
