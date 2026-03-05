import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST /api/acceptance — Tạo biên bản nghiệm thu
export const POST = withAuth(async (request, context, session) => {
    const body = await request.json();
    const { projectId, milestoneId, title, items, notes, inspector, customerRep } = body;

    if (!projectId || !title) {
        return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    // Generate code
    const count = await prisma.acceptanceReport.count();
    const code = `NT-${String(count + 1).padStart(4, '0')}`;

    const report = await prisma.acceptanceReport.create({
        data: {
            code,
            projectId,
            milestoneId: milestoneId || null,
            title,
            items: items || [],
            notes: notes || '',
            inspector: inspector || session.user?.name || '',
            customerRep: customerRep || '',
            createdBy: session.user?.name || '',
        },
        include: {
            project: { select: { code: true, name: true } },
            milestone: { select: { name: true } },
        },
    });

    return NextResponse.json(report, { status: 201 });
});

// GET /api/acceptance — Lấy danh sách biên bản nghiệm thu
export const GET = withAuth(async (request, context, session) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const where = {};
    if (projectId) where.projectId = projectId;

    const reports = await prisma.acceptanceReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            project: { select: { code: true, name: true } },
            milestone: { select: { name: true } },
        },
    });

    return NextResponse.json({ data: reports });
});
