import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (req, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const data = {};
    if (body.area !== undefined) data.area = body.area;
    if (body.description !== undefined) data.description = body.description;
    if (body.assignee !== undefined) data.assignee = body.assignee;
    if (body.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline) : null;
    if (body.status !== undefined) {
        data.status = body.status;
        if (body.status === 'Đã sửa' || body.status === 'KH xác nhận') {
            data.resolvedAt = new Date();
        }
    }
    if (body.images !== undefined) data.images = body.images;

    const item = await prisma.punchListItem.update({ where: { id }, data });
    return NextResponse.json(item);
});

export const DELETE = withAuth(async (req, { params }) => {
    const { id } = await params;
    await prisma.punchListItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
});
