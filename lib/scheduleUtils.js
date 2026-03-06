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
 * Cascade dependencies based on TaskDependency model.
 * Supports FS, SS, FF, SF dependency types with lag.
 * Guards against circular dependencies with a visited set.
 */
export async function cascadeDependencies(task, visited = new Set()) {
    if (visited.has(task.id)) return;
    visited.add(task.id);

    // New: TaskDependency model — where this task is the dependsOn (predecessor)
    const deps = await prisma.taskDependency.findMany({
        where: { dependsOnId: task.id },
        include: { task: true },
    });

    // Also check old-style predecessorId successors for backward compat
    const oldSuccessors = await prisma.scheduleTask.findMany({
        where: { predecessorId: task.id },
    });

    const allSuccessors = [
        ...deps.map(d => ({ successor: d.task, type: d.type || 'FS', lag: d.lag || 0 })),
        ...oldSuccessors.filter(s => !deps.some(d => d.taskId === s.id)).map(s => ({ successor: s, type: 'FS', lag: 0 })),
    ];

    for (const { successor: succ, type, lag } of allSuccessors) {
        const predEnd = new Date(task.endDate);
        const predStart = new Date(task.startDate);
        const lagMs = lag * 86400000;
        const duration = succ.duration || 1;

        let newStart, newEnd;
        switch (type) {
            case 'FS':
                newStart = new Date(predEnd.getTime() + lagMs);
                newEnd = new Date(newStart.getTime() + duration * 86400000);
                break;
            case 'SS':
                newStart = new Date(predStart.getTime() + lagMs);
                newEnd = new Date(newStart.getTime() + duration * 86400000);
                break;
            case 'FF':
                newEnd = new Date(predEnd.getTime() + lagMs);
                newStart = new Date(newEnd.getTime() - duration * 86400000);
                break;
            case 'SF':
                newEnd = new Date(predStart.getTime() + lagMs);
                newStart = new Date(newEnd.getTime() - duration * 86400000);
                break;
            default:
                continue;
        }

        // Only shift forward
        if (newStart > new Date(succ.startDate)) {
            const updated = await prisma.scheduleTask.update({
                where: { id: succ.id },
                data: {
                    startDate: newStart,
                    endDate: newEnd,
                    duration: Math.max(1, Math.ceil((newEnd - newStart) / 86400000)),
                },
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
    // TaskDependency records auto-cascade via onDelete: Cascade
    await prisma.scheduleTask.delete({ where: { id: taskId } });
}
