import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/apiHandler';

export const GET = withAuth(async (req, { params }) => {
    const { id } = await params;
    const template = await prisma.contractTemplate.findUnique({ where: { id } });
    if (!template) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json(template);
});

export const PUT = withAuth(async (req, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const { name, type, body: templateBody, isDefault } = body;

    // If setting as default, unset other defaults of same type
    if (isDefault && type) {
        await prisma.contractTemplate.updateMany({
            where: { type, isDefault: true, id: { not: id } },
            data: { isDefault: false },
        });
    }

    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (type !== undefined) data.type = type;
    if (templateBody !== undefined) data.body = templateBody;
    if (isDefault !== undefined) data.isDefault = isDefault;

    const template = await prisma.contractTemplate.update({ where: { id }, data });
    return NextResponse.json(template);
}, { roles: ['admin', 'manager'] });

export const DELETE = withAuth(async (req, { params }) => {
    const { id } = await params;
    await prisma.contractTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
}, { roles: ['admin', 'manager'] });
