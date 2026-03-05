import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (req, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const data = {};
    if (body.weather !== undefined) data.weather = body.weather;
    if (body.workerCount !== undefined) data.workerCount = parseInt(body.workerCount) || 0;
    if (body.progress !== undefined) data.progress = body.progress;
    if (body.issues !== undefined) data.issues = body.issues;
    if (body.images !== undefined) data.images = body.images;
    const log = await prisma.siteLog.update({ where: { id }, data });
    return NextResponse.json(log);
});

export const DELETE = withAuth(async (req, { params }) => {
    const { id } = await params;
    await prisma.siteLog.delete({ where: { id } });
    return NextResponse.json({ ok: true });
});
