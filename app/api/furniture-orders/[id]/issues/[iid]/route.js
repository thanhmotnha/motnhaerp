import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// PUT /api/furniture-orders/[id]/issues/[iid]
// Body: { status, resolvedNote, resolvedBy, ... }
export const PUT = withAuth(async (request, { params }, session) => {
    const { iid } = await params;
    const body = await request.json();

    const data = {};
    if (body.status) data.status = body.status;
    if (body.issueType) data.issueType = body.issueType;
    if (body.title) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.priority) data.priority = body.priority;
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl;
    if (body.resolvedNote !== undefined) data.resolvedNote = body.resolvedNote;

    if (body.status === 'resolved') {
        data.resolvedAt = new Date();
        data.resolvedBy = session.user.name || '';
    }

    const issue = await prisma.furnitureIssue.update({ where: { id: iid }, data });
    return NextResponse.json(issue);
});

// DELETE /api/furniture-orders/[id]/issues/[iid]
export const DELETE = withAuth(async (request, { params }) => {
    const { iid } = await params;
    await prisma.furnitureIssue.delete({ where: { id: iid } });
    return NextResponse.json({ ok: true });
});
