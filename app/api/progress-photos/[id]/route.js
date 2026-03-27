import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const DELETE = withAuth(async (req, { params }) => {
    const { id } = await params;
    await prisma.progressPhoto.delete({ where: { id } });
    return NextResponse.json({ ok: true });
});

export const PATCH = withAuth(async (req, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const data = {};
    if (body.caption !== undefined) data.caption = body.caption;
    if (body.phase !== undefined) data.phase = body.phase;
    if (body.takenAt !== undefined) data.takenAt = body.takenAt ? new Date(body.takenAt) : null;
    const item = await prisma.progressPhoto.update({ where: { id }, data });
    return NextResponse.json(item);
});
