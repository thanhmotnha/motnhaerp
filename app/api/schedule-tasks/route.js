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

    // Batch-fetch toàn bộ tasks + dependencies của project — tránh N+1 trong cascade
    const projectId = results[0]?.projectId;
    if (projectId) {
        const [allTasks, allDeps] = await Promise.all([
            prisma.scheduleTask.findMany({
                where: { projectId },
                select: { id: true, startDate: true, endDate: true, duration: true },
            }),
            prisma.taskDependency.findMany({
                where: { task: { projectId } },
                select: { taskId: true, dependsOnId: true, type: true, lag: true },
            }),
        ]);

        // Build in-memory maps
        const taskById = new Map(allTasks.map(t => [t.id, { ...t }]));
        // dependsOnId → [{ taskId, type, lag }] (forward edges: who depends on this?)
        const successorMap = new Map();
        for (const dep of allDeps) {
            if (!successorMap.has(dep.dependsOnId)) successorMap.set(dep.dependsOnId, []);
            successorMap.get(dep.dependsOnId).push(dep);
        }

        // BFS cascade entirely in-memory
        const pendingUpdates = new Map(); // id → { startDate, endDate, duration }
        const updatedIds = new Set(results.map(r => r.id));
        const queue = [...updatedIds];

        while (queue.length > 0) {
            const currentId = queue.shift();
            const current = pendingUpdates.get(currentId) || taskById.get(currentId);
            if (!current) continue;

            const successors = successorMap.get(currentId) || [];
            for (const dep of successors) {
                const successor = taskById.get(dep.taskId);
                if (!successor || updatedIds.has(dep.taskId)) continue;

                const predEnd = new Date(current.endDate);
                const predStart = new Date(current.startDate);
                const lag = (dep.lag || 0) * 86400000;
                const duration = successor.duration || 1;

                let newStart, newEnd;
                switch (dep.type) {
                    case 'FS': newStart = new Date(predEnd.getTime() + lag); newEnd = new Date(newStart.getTime() + duration * 86400000); break;
                    case 'SS': newStart = new Date(predStart.getTime() + lag); newEnd = new Date(newStart.getTime() + duration * 86400000); break;
                    case 'FF': newEnd = new Date(predEnd.getTime() + lag); newStart = new Date(newEnd.getTime() - duration * 86400000); break;
                    case 'SF': newEnd = new Date(predStart.getTime() + lag); newStart = new Date(newEnd.getTime() - duration * 86400000); break;
                    default: continue;
                }

                // Only shift forward
                if (newStart > new Date(successor.startDate)) {
                    const newDuration = Math.max(1, Math.ceil((newEnd - newStart) / 86400000));
                    pendingUpdates.set(dep.taskId, { ...successor, startDate: newStart, endDate: newEnd, duration: newDuration });
                    updatedIds.add(dep.taskId);
                    queue.push(dep.taskId);
                }
            }
        }

        // Single $transaction for all cascade updates
        if (pendingUpdates.size > 0) {
            await prisma.$transaction(
                [...pendingUpdates.entries()].map(([id, u]) =>
                    prisma.scheduleTask.update({ where: { id }, data: { startDate: u.startDate, endDate: u.endDate, duration: u.duration } })
                )
            );
        }

        await recalcProjectProgress(projectId);
    }

    return NextResponse.json({ updated: results, cascaded: [...updatedIds].filter(id => !results.find(r => r.id === id)) });
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
