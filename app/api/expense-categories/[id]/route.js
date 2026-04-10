import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { name, code, description, parentId, linkType, sortOrder, isActive } = body;

    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (code !== undefined) data.code = code.trim().toUpperCase();
    if (description !== undefined) data.description = description;
    if (parentId !== undefined) data.parentId = parentId || null;
    if (linkType !== undefined) data.linkType = linkType;
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder) || 0;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const cat = await prisma.expenseCategory.update({ where: { id }, data });
    return NextResponse.json(cat);
}, { roles: ['giam_doc', 'ke_toan'] });

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.expenseCategory.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ ok: true });
}, { roles: ['giam_doc', 'ke_toan'] });
