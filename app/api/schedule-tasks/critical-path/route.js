import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/schedule-tasks/critical-path?projectId=xxx
// CPM (Critical Path Method) algorithm
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    // Load tasks + dependencies
    const tasks = await prisma.scheduleTask.findMany({
        where: { projectId, parentId: null },
        include: {
            dependencies: true,   // tasks this depends on
        },
        orderBy: { startDate: 'asc' },
    });

    if (!tasks.length) return NextResponse.json({ tasks: [], criticalPath: [] });

    // Build adjacency
    const taskMap = {};
    for (const t of tasks) {
        taskMap[t.id] = {
            id: t.id,
            name: t.name,
            duration: t.duration || 1,
            deps: t.dependencies.map(d => d.dependsOnId),
            es: 0, ef: 0, ls: 0, lf: 0, float: 0,
            isCritical: false,
        };
    }

    // Topological sort (Kahn's algorithm)
    const inDegree = {};
    const adj = {}; // dependsOn -> [task]
    for (const id in taskMap) {
        inDegree[id] = taskMap[id].deps.length;
        for (const dep of taskMap[id].deps) {
            if (!adj[dep]) adj[dep] = [];
            adj[dep].push(id);
        }
    }

    const queue = [];
    for (const id in taskMap) {
        if (inDegree[id] === 0) queue.push(id);
    }

    const topoOrder = [];
    while (queue.length) {
        const id = queue.shift();
        topoOrder.push(id);
        for (const next of (adj[id] || [])) {
            inDegree[next]--;
            if (inDegree[next] === 0) queue.push(next);
        }
    }

    // Forward pass: ES, EF
    for (const id of topoOrder) {
        const t = taskMap[id];
        for (const dep of t.deps) {
            if (taskMap[dep]) {
                t.es = Math.max(t.es, taskMap[dep].ef);
            }
        }
        t.ef = t.es + t.duration;
    }

    // Project duration
    const projectDuration = Math.max(...Object.values(taskMap).map(t => t.ef));

    // Backward pass: LF, LS
    for (const id of [...topoOrder].reverse()) {
        const t = taskMap[id];
        const successors = adj[id] || [];
        if (successors.length === 0) {
            t.lf = projectDuration;
        } else {
            t.lf = Math.min(...successors.map(s => taskMap[s].ls));
        }
        t.ls = t.lf - t.duration;
        t.float = t.ls - t.es;
        t.isCritical = t.float === 0;
    }

    const result = topoOrder.map(id => taskMap[id]);
    const criticalPath = result.filter(t => t.isCritical).map(t => t.id);

    return NextResponse.json({
        tasks: result,
        criticalPath,
        projectDuration,
    });
}
