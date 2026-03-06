import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const where = { projectId };
    const priority = searchParams.get('priority');
    const assigneeId = searchParams.get('assigneeId');
    const status = searchParams.get('status');
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;
    if (status) where.status = status;

    const items = await prisma.punchListItem.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }],
    });
    return NextResponse.json(items);
});

export const POST = withAuth(async (req) => {
    const body = await req.json();
    const { projectId, area = '', description, assignee = '', assigneeId, priority = 'Trung bình', deadline, status = 'Mở', images } = body;
    if (!projectId || !description?.trim()) {
        return NextResponse.json({ error: 'projectId và description là bắt buộc' }, { status: 400 });
    }
    const item = await prisma.punchListItem.create({
        data: {
            projectId, area, description: description.trim(), assignee,
            assigneeId: assigneeId || null,
            priority,
            deadline: deadline ? new Date(deadline) : null,
            status,
            images: images ? JSON.stringify(images) : '[]',
        },
    });
    return NextResponse.json(item, { status: 201 });
});
