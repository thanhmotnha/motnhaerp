import prisma from '@/lib/prisma';

/**
 * Recalculate project progress from root-level schedule tasks.
 * Used by schedule-tasks CRUD routes.
 */
export async function recalcProjectProgress(projectId) {
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

/**
 * Recalculate parent task progress from its children (weighted average).
 * Cascades up the tree recursively.
 */
export async function recalcParentProgress(parentId) {
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
    if (parent.parentId) await recalcParentProgress(parent.parentId);
}

/**
 * Cascade Finish-to-Start dependencies.
 * Guards against circular dependencies with a visited set.
 */
export async function cascadeDependencies(task, visited = new Set()) {
    if (visited.has(task.id)) return; // circular dep guard
    visited.add(task.id);

    const successors = await prisma.scheduleTask.findMany({
        where: { predecessorId: task.id },
    });
    for (const succ of successors) {
        const predEnd = new Date(task.endDate);
        const succStart = new Date(succ.startDate);
        if (succStart <= predEnd) {
            const newStart = new Date(predEnd);
            newStart.setDate(newStart.getDate() + 1);
            const newEnd = new Date(newStart);
            newEnd.setDate(newEnd.getDate() + succ.duration - 1);
            const updated = await prisma.scheduleTask.update({
                where: { id: succ.id },
                data: { startDate: newStart, endDate: newEnd },
            });
            await cascadeDependencies(updated, visited);
        }
    }
}

/**
 * Recursively delete a task and ALL nested descendants (deep).
 */
export async function deleteTaskDeep(taskId) {
    const children = await prisma.scheduleTask.findMany({
        where: { parentId: taskId },
        select: { id: true },
    });
    for (const child of children) {
        await deleteTaskDeep(child.id);
    }
    // Clear predecessor refs pointing to this task
    await prisma.scheduleTask.updateMany({
        where: { predecessorId: taskId },
        data: { predecessorId: null },
    });
    await prisma.scheduleTask.delete({ where: { id: taskId } });
}
