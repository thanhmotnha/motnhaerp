import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { scheduleTaskCreateSchema, scheduleTaskBulkUpdateSchema } from '@/lib/validations/scheduleTask';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const tasks = await prisma.scheduleTask.findMany({
        where: { projectId },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        include: {
            dependencies: { include: { dependsOn: { select: { id: true, name: true, endDate: true, startDate: true } } } },
            dependents: { include: { task: { select: { id: true, name: true, startDate: true } } } },
            contractors: { include: { contractor: { select: { id: true, name: true, type: true } } } },
        },
    });

    // Build tree structure
    const taskMap = new Map();
    const roots = [];
    tasks.forEach(t => taskMap.set(t.id, { ...t, children: [] }));
    tasks.forEach(t => {
        const node = taskMap.get(t.id);
        if (t.parentId && taskMap.has(t.parentId)) {
            taskMap.get(t.parentId).children.push(node);
        } else {
            roots.push(node);
        }
    });

    // Calculate weighted progress
    const calcProgress = (nodes) => {
        if (!nodes.length) return 0;
        const totalWeight = nodes.reduce((s, n) => s + n.weight, 0);
        if (totalWeight === 0) return 0;
        return Math.round(nodes.reduce((s, n) => s + n.progress * n.weight, 0) / totalWeight);
    };

    return NextResponse.json({
        tasks: roots,
        flat: tasks,
        totalProgress: calcProgress(tasks.filter(t => !t.parentId)),
    });
});

export const POST = withAuth(async (request) => {
    const body = await request.json();

    // Single create
    const data = scheduleTaskCreateSchema.parse(body);

    // Auto-calc duration
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const diffDays = Math.max(1, Math.ceil((end - start) / 86400000));
    data.duration = diffDays;

    const task = await prisma.scheduleTask.create({ data });

    // Recalc project progress
    await recalcProjectProgress(data.projectId);

    return NextResponse.json(task, { status: 201 });
});

// Bulk update (for Gantt drag & drop) + cascade dependents
export const PUT = withAuth(async (request) => {
    const body = await request.json();
    const updates = scheduleTaskBulkUpdateSchema.parse(body);

    const results = await prisma.$transaction(
        updates.map(u => {
            const { id, ...data } = u;
            if (data.startDate && data.endDate) {
                data.duration = Math.max(1, Math.ceil((new Date(data.endDate) - new Date(data.startDate)) / 86400000));
            }
            return prisma.scheduleTask.update({ where: { id }, data });
        })
    );

    // Cascade recalc dependents
    const cascadedIds = [];
    const updatedIds = new Set(results.map(r => r.id));
    const queue = [...updatedIds];

    while (queue.length > 0) {
        const currentId = queue.shift();
        const current = await prisma.scheduleTask.findUnique({ where: { id: currentId } });
        if (!current) continue;

        // Find deps where THIS task is the dependency (dependsOn)
        const deps = await prisma.taskDependency.findMany({
            where: { dependsOnId: currentId },
            include: { task: true },
        });

        for (const dep of deps) {
            const successor = dep.task;
            if (updatedIds.has(successor.id)) continue; // Already handled

            const predEnd = new Date(current.endDate);
            const predStart = new Date(current.startDate);
            const lag = (dep.lag || 0) * 86400000;
            const duration = successor.duration || 1;

            let newStart, newEnd;
            switch (dep.type) {
                case 'FS': // Finish-to-Start
                    newStart = new Date(predEnd.getTime() + lag);
                    newEnd = new Date(newStart.getTime() + duration * 86400000);
                    break;
                case 'SS': // Start-to-Start
                    newStart = new Date(predStart.getTime() + lag);
                    newEnd = new Date(newStart.getTime() + duration * 86400000);
                    break;
                case 'FF': // Finish-to-Finish
                    newEnd = new Date(predEnd.getTime() + lag);
                    newStart = new Date(newEnd.getTime() - duration * 86400000);
                    break;
                case 'SF': // Start-to-Finish
                    newEnd = new Date(predStart.getTime() + lag);
                    newStart = new Date(newEnd.getTime() - duration * 86400000);
                    break;
                default:
                    continue;
            }

            // Only shift forward, never backward (preserve manual early starts)
            if (newStart > new Date(successor.startDate)) {
                await prisma.scheduleTask.update({
                    where: { id: successor.id },
                    data: {
                        startDate: newStart,
                        endDate: newEnd,
                        duration: Math.max(1, Math.ceil((newEnd - newStart) / 86400000)),
                    },
                });
                cascadedIds.push(successor.id);
                updatedIds.add(successor.id);
                queue.push(successor.id); // Continue cascade
            }
        }
    }

    if (results.length > 0) {
        await recalcProjectProgress(results[0].projectId);
    }

    return NextResponse.json({ updated: results, cascaded: cascadedIds });
});

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
