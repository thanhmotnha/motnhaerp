import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// PATCH to toggle active/deactivate
export const PATCH = withAuth(async (req, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const data = {};
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.description !== undefined) data.description = body.description;
    if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    const token = await prisma.clientPortalToken.update({ where: { id }, data });
    return NextResponse.json(token);
});

export const DELETE = withAuth(async (req, { params }) => {
    const { id } = await params;
    await prisma.clientPortalToken.delete({ where: { id } });
    return NextResponse.json({ ok: true });
});
