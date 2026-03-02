import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { scheduleTaskUpdateSchema } from '@/lib/validations/scheduleTask';
import { recalcProjectProgress, recalcParentProgress, cascadeDependencies, deleteTaskDeep } from '@/lib/scheduleUtils';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const task = await prisma.scheduleTask.findUnique({
        where: { id },
        include: { children: { orderBy: { order: 'asc' } } },
    });
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(task);
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const data = scheduleTaskUpdateSchema.parse(body);

    // Auto-calc duration if both dates provided
    if (data.startDate && data.endDate) {
        data.duration = Math.max(1, Math.ceil((new Date(data.endDate) - new Date(data.startDate)) / 86400000));
    }

    // Auto-set status based on progress
    if (data.progress !== undefined) {
        if (data.progress === 100) data.status = 'Hoàn thành';
        else if (data.progress > 0) data.status = 'Đang thi công';
        else data.status = 'Chưa bắt đầu';
    }

    const task = await prisma.scheduleTask.update({ where: { id }, data });

    // Cascade: if has predecessor dependency, shift successors (with circular guard)
    if (data.endDate) {
        await cascadeDependencies(task);
    }

    // Recalc parent progress if child
    if (task.parentId) {
        await recalcParentProgress(task.parentId);
    }

    // Recalc project progress
    await recalcProjectProgress(task.projectId);

    return NextResponse.json(task);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const task = await prisma.scheduleTask.findUnique({ where: { id } });
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Deep delete: recursively removes all descendants
    await deleteTaskDeep(id);

    // Recalc
    await recalcProjectProgress(task.projectId);

    return NextResponse.json({ success: true });
});
