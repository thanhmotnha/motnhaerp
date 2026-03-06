'use strict';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET all dependencies for a project
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const taskId = searchParams.get('taskId');

    const where = {};
    if (taskId) {
        where.OR = [{ taskId }, { dependsOnId: taskId }];
    } else if (projectId) {
        where.task = { projectId };
    } else {
        return NextResponse.json({ error: 'projectId or taskId required' }, { status: 400 });
    }

    const deps = await prisma.taskDependency.findMany({
        where,
        include: {
            task: { select: { id: true, name: true, startDate: true, endDate: true } },
            dependsOn: { select: { id: true, name: true, startDate: true, endDate: true } },
        },
        orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(deps);
});

// POST create dependency
export const POST = withAuth(async (request) => {
    const { taskId, dependsOnId, type = 'FS', lag = 0 } = await request.json();

    if (!taskId || !dependsOnId) {
        return NextResponse.json({ error: 'taskId and dependsOnId required' }, { status: 400 });
    }
    if (taskId === dependsOnId) {
        return NextResponse.json({ error: 'Cannot depend on itself' }, { status: 400 });
    }

    // Check circular dependency
    const visited = new Set();
    const hasCircle = async (id) => {
        if (id === taskId) return true;
        if (visited.has(id)) return false;
        visited.add(id);
        const deps = await prisma.taskDependency.findMany({
            where: { taskId: id },
            select: { dependsOnId: true },
        });
        for (const d of deps) {
            if (await hasCircle(d.dependsOnId)) return true;
        }
        return false;
    };

    if (await hasCircle(dependsOnId)) {
        return NextResponse.json({ error: 'Circular dependency detected' }, { status: 400 });
    }

    const dep = await prisma.taskDependency.create({
        data: { taskId, dependsOnId, type, lag: Number(lag) || 0 },
    });

    return NextResponse.json(dep, { status: 201 });
});

// DELETE dependency
export const DELETE = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await prisma.taskDependency.delete({ where: { id } });

    return NextResponse.json({ ok: true });
});
