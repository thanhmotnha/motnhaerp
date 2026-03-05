import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (req, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const data = {};
    const fields = ['title', 'description', 'reportedBy', 'assignee', 'priority', 'status', 'notes', 'images'];
    fields.forEach(f => { if (body[f] !== undefined) data[f] = body[f]; });
    if (body.status === 'Đã xử lý' || body.status === 'Đóng') {
        data.resolvedAt = new Date();
    }
    const ticket = await prisma.warrantyTicket.update({ where: { id }, data });
    return NextResponse.json(ticket);
});

export const DELETE = withAuth(async (req, { params }) => {
    const { id } = await params;
    await prisma.warrantyTicket.delete({ where: { id } });
    return NextResponse.json({ ok: true });
});
