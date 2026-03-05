import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const where = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    const tickets = await prisma.warrantyTicket.findMany({
        where,
        include: { project: { select: { id: true, code: true, name: true } } },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(tickets);
});

export const POST = withAuth(async (req) => {
    const body = await req.json();
    const { projectId, title, description = '', reportedBy = '', assignee = '', priority = 'Trung bình' } = body;
    if (!projectId || !title?.trim()) {
        return NextResponse.json({ error: 'projectId và title là bắt buộc' }, { status: 400 });
    }
    const code = await generateCode('warrantyTicket', 'BH');
    const ticket = await prisma.warrantyTicket.create({
        data: { code, projectId, title: title.trim(), description, reportedBy, assignee, priority },
    });
    return NextResponse.json(ticket, { status: 201 });
});
