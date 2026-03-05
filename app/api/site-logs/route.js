import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const logs = await prisma.siteLog.findMany({
        where: { projectId },
        orderBy: { date: 'desc' },
    });
    return NextResponse.json(logs);
});

export const POST = withAuth(async (req) => {
    const body = await req.json();
    const { projectId, date, weather = 'Nắng', workerCount = 0, progress = '', issues = '', createdBy = '' } = body;
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    const log = await prisma.siteLog.create({
        data: {
            projectId, weather, progress, issues, createdBy,
            workerCount: parseInt(workerCount) || 0,
            date: date ? new Date(date) : new Date(),
        },
    });
    return NextResponse.json(log, { status: 201 });
});
