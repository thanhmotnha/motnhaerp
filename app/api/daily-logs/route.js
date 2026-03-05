import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST /api/daily-logs — Tạo nhật ký công trường
export const POST = withAuth(async (request, context, session) => {
    const body = await request.json();
    const { projectId, weather, workforce, workDone, issues, tomorrowPlan, date } = body;

    if (!projectId) {
        return NextResponse.json({ error: 'Thiếu projectId' }, { status: 400 });
    }
    if (!workDone?.trim()) {
        return NextResponse.json({ error: 'Thiếu nội dung công việc' }, { status: 400 });
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, code: true },
    });

    if (!project) {
        return NextResponse.json({ error: 'Dự án không tồn tại' }, { status: 404 });
    }

    // Tạo SiteLog — match schema fields: workerCount, progress, images
    const siteLog = await prisma.siteLog.create({
        data: {
            projectId,
            date: date ? new Date(date) : new Date(),
            weather: weather || 'Nắng',
            workerCount: workforce ? parseInt(workforce) || 0 : 0,
            progress: workDone.trim(),
            issues: issues?.trim() || '',
            images: JSON.stringify([]),
            createdBy: session.user?.name || session.user?.email || '',
        },
    });

    return NextResponse.json(siteLog, { status: 201 });
});

// GET /api/daily-logs — Lấy danh sách nhật ký
export const GET = withAuth(async (request, context, session) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where = {};
    if (projectId) where.projectId = projectId;

    const logs = await prisma.siteLog.findMany({
        where,
        orderBy: { date: 'desc' },
        take: limit,
        include: {
            project: { select: { code: true, name: true } },
        },
    });

    return NextResponse.json({ data: logs });
});
