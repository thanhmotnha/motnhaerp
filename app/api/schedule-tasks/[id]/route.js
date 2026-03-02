import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { scheduleTaskUpdateSchema } from '@/lib/validations/scheduleTask';

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

    // Cascade: if has predecessor dependency, shift successors
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

    // Delete children first (cascade)
    await prisma.scheduleTask.deleteMany({ where: { parentId: id } });
    // Clear predecessor references pointing to this task
    await prisma.scheduleTask.updateMany({ where: { predecessorId: id }, data: { predecessorId: null } });
    await prisma.scheduleTask.delete({ where: { id } });

    // Recalc
    await recalcProjectProgress(task.projectId);

    return NextResponse.json({ success: true });
});

// Cascade Finish-to-Start dependencies
async function cascadeDependencies(task) {
    const successors = await prisma.scheduleTask.findMany({
        where: { predecessorId: task.id },
    });
    for (const succ of successors) {
        const predEnd = new Date(task.endDate);
        const succStart = new Date(succ.startDate);
        if (succStart <= predEnd) {
            // Shift successor: start = predEnd + 1 day
            const newStart = new Date(predEnd);
            newStart.setDate(newStart.getDate() + 1);
            const newEnd = new Date(newStart);
            newEnd.setDate(newEnd.getDate() + succ.duration - 1);
            const updated = await prisma.scheduleTask.update({
                where: { id: succ.id },
                data: { startDate: newStart, endDate: newEnd },
            });
            // Recursive cascade
            await cascadeDependencies(updated);
        }
    }
}

async function recalcParentProgress(parentId) {
    const children = await prisma.scheduleTask.findMany({ where: { parentId } });
    if (!children.length) return;
    const totalWeight = children.reduce((s, c) => s + c.weight, 0);
    const progress = totalWeight > 0
        ? Math.round(children.reduce((s, c) => s + c.progress * c.weight, 0) / totalWeight)
        : 0;
    const parent = await prisma.scheduleTask.update({
        where: { id: parentId },
        data: {
            progress,
            status: progress === 100 ? 'Hoàn thành' : progress > 0 ? 'Đang thi công' : 'Chưa bắt đầu',
        },
    });
    // Cascade up
    if (parent.parentId) await recalcParentProgress(parent.parentId);
}

async function recalcProjectProgress(projectId) {
    const tasks = await prisma.scheduleTask.findMany({
        where: { projectId, parentId: null },
    });
    if (tasks.length === 0) return;
    const totalWeight = tasks.reduce((s, t) => s + t.weight, 0);
    const progress = totalWeight > 0
        ? Math.round(tasks.reduce((s, t) => s + t.progress * t.weight, 0) / totalWeight)
        : 0;
    await prisma.project.update({ where: { id: projectId }, data: { progress } });
}
