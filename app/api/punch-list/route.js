import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const items = await prisma.punchListItem.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(items);
});

export const POST = withAuth(async (req) => {
    const body = await req.json();
    const { projectId, area = '', description, assignee = '', deadline, status = 'Mở' } = body;
    if (!projectId || !description?.trim()) {
        return NextResponse.json({ error: 'projectId và description là bắt buộc' }, { status: 400 });
    }
    const item = await prisma.punchListItem.create({
        data: { projectId, area, description: description.trim(), assignee, deadline: deadline ? new Date(deadline) : null, status },
    });
    return NextResponse.json(item, { status: 201 });
});
