import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const where = { projectId };
    const phase = searchParams.get('phase');
    if (phase) where.phase = phase;

    const items = await prisma.progressPhoto.findMany({
        where,
        orderBy: [{ takenAt: 'desc' }],
    });
    return NextResponse.json(items);
});

export const POST = withAuth(async (req) => {
    const body = await req.json();
    const {
        projectId, title = '', description = '', phase = '',
        photoUrl, location = '', takenAt,
    } = body;
    if (!projectId || !photoUrl?.trim()) {
        return NextResponse.json({ error: 'projectId và photoUrl là bắt buộc' }, { status: 400 });
    }
    const item = await prisma.progressPhoto.create({
        data: {
            projectId, title, description, phase,
            photoUrl: photoUrl.trim(), location,
            takenAt: takenAt ? new Date(takenAt) : new Date(),
        },
    });
    return NextResponse.json(item, { status: 201 });
});

export const DELETE = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await prisma.progressPhoto.delete({ where: { id } });
    return NextResponse.json({ ok: true });
});
