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
    const slaBreached = searchParams.get('slaBreached');
    if (slaBreached === 'true') where.slaBreached = true;
    const category = searchParams.get('category');
    if (category) where.category = category;

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
        data: {
            code, projectId, title: title.trim(), description, reportedBy, assignee, priority,
            warrantyEndDate: body.warrantyEndDate ? new Date(body.warrantyEndDate) : null,
            slaDeadline: body.slaDeadline ? new Date(body.slaDeadline) : null,
            category: body.category || '',
            furnitureOrderId: body.furnitureOrderId || null,
        },
    });
    return NextResponse.json(ticket, { status: 201 });
});
