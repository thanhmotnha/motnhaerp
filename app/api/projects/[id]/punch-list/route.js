import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export const GET = withAuth(async (request, context) => {
    const { id } = await context.params;
    const items = await prisma.punchListItem.findMany({
        where: { projectId: id },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(items);
});

export const POST = withAuth(async (request, context) => {
    const { id } = await context.params;
    const { description, area, assignee, priority, deadline } = await request.json();
    if (!description?.trim()) return NextResponse.json({ error: 'Nhập mô tả lỗi!' }, { status: 400 });
    const item = await prisma.punchListItem.create({
        data: { projectId: id, description, area: area || '', assignee: assignee || '', priority: priority || 'Trung bình', deadline: deadline ? new Date(deadline) : null },
    });
    return NextResponse.json(item, { status: 201 });
});

export const PUT = withAuth(async (request, context) => {
    const { id: projectId } = await context.params;
    const { id, status, ...rest } = await request.json();
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });
    const item = await prisma.punchListItem.update({
        where: { id, projectId },
        data: { status, ...rest, resolvedAt: status === 'Đã xử lý' ? new Date() : null },
    });
    return NextResponse.json(item);
});
