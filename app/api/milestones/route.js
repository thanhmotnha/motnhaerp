import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export const POST = withAuth(async (request, context, session) => {
    const body = await request.json();
    const { projectId, name, plannedDate, description, progress, status } = body;
    if (!projectId || !name) {
        return NextResponse.json({ error: 'projectId và name là bắt buộc' }, { status: 400 });
    }
    const milestone = await prisma.projectMilestone.create({
        data: {
            projectId,
            name,
            plannedDate: plannedDate ? new Date(plannedDate) : null,
            description: description || null,
            progress: Number(progress) || 0,
            status: status || 'Chưa bắt đầu',
        },
    });
    return NextResponse.json(milestone, { status: 201 });
});
