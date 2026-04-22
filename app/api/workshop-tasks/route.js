import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { workshopTaskCreateSchema, workshopTaskBulkCreateSchema } from '@/lib/validations/workshopTask';
import { notifyTaskAssigned } from '@/lib/zaloNotify';

// GET — list tasks (filter by worker/date/status)
export const GET = withAuth(async (request, _ctx, session) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const workerId = searchParams.get('workerId');
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const projectId = searchParams.get('projectId');

    const where = {};
    if (workerId) where.workerId = workerId;
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;
    if (from || to) {
        where.dueDate = {};
        if (from) where.dueDate.gte = new Date(from);
        if (to) where.dueDate.lte = new Date(to);
    }

    // If logged-in user is not manager (kho/giam_doc/ke_toan), restrict to own tasks
    if (!['giam_doc', 'ke_toan', 'kho'].includes(session.user.role)) {
        where.workerId = session.user.id;
    }

    const [tasks, total] = await Promise.all([
        prisma.workshopTask.findMany({
            where,
            include: {
                worker: { select: { id: true, name: true } },
                assignedBy: { select: { id: true, name: true } },
                project: { select: { id: true, name: true, code: true } },
                productionBatch: { select: { id: true, code: true } },
            },
            orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
            skip,
            take: limit,
        }),
        prisma.workshopTask.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(tasks, total, { page, limit }));
});

// POST — single task OR bulk assign to multiple workers
export const POST = withAuth(async (request, _ctx, session) => {
    if (!['giam_doc', 'ke_toan', 'kho'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Không có quyền tạo công việc' }, { status: 403 });
    }
    const body = await request.json();

    // Bulk mode
    if (Array.isArray(body.workerIds)) {
        const data = workshopTaskBulkCreateSchema.parse(body);
        const created = await prisma.$transaction(
            data.workerIds.map(workerId =>
                prisma.workshopTask.create({
                    data: {
                        title: data.title,
                        description: data.description || '',
                        workerId,
                        assignedById: session.user.id,
                        dueDate: new Date(data.dueDate),
                        priority: data.priority,
                        productionBatchId: data.productionBatchId,
                        projectId: data.projectId,
                    },
                })
            )
        );
        // Fire-and-forget Zalo notifications to workers
        Promise.all(created.map(t => notifyTaskAssigned(t.id))).catch(() => { });
        return NextResponse.json({ created: created.length }, { status: 201 });
    }

    // Single mode
    const data = workshopTaskCreateSchema.parse(body);
    const task = await prisma.workshopTask.create({
        data: { ...data, assignedById: session.user.id },
        include: { worker: { select: { id: true, name: true } } },
    });
    notifyTaskAssigned(task.id).catch(() => { });
    return NextResponse.json(task, { status: 201 });
});
