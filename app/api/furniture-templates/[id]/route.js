import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET detail
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const template = await prisma.furnitureTemplate.findUniqueOrThrow({ where: { id } });
    return NextResponse.json({
        ...template,
        items: JSON.parse(template.items || '[]'),
        materials: JSON.parse(template.materials || '[]'),
    });
});

// PUT update
export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const data = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.category !== undefined) data.category = body.category;
    if (body.roomType !== undefined) data.roomType = body.roomType;
    if (body.styleNote !== undefined) data.styleNote = body.styleNote;
    if (body.items !== undefined) data.items = JSON.stringify(body.items);
    if (body.materials !== undefined) data.materials = JSON.stringify(body.materials);
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const template = await prisma.furnitureTemplate.update({ where: { id }, data });
    return NextResponse.json({
        ...template,
        items: JSON.parse(template.items || '[]'),
        materials: JSON.parse(template.materials || '[]'),
    });
}, { roles: ['giam_doc', 'pho_gd', 'quan_ly_du_an'] });

// DELETE
export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.furnitureTemplate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}, { roles: ['giam_doc', 'pho_gd'] });
