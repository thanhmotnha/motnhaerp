import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { workshopTaskUpdateSchema } from '@/lib/validations/workshopTask';

export const GET = withAuth(async (_req, { params }) => {
    const { id } = await params;
    const task = await prisma.workshopTask.findUnique({
        where: { id },
        include: {
            worker: { select: { id: true, name: true } },
            assignedBy: { select: { id: true, name: true } },
            project: { select: { id: true, name: true, code: true } },
            productionBatch: { select: { id: true, code: true } },
        },
    });
    if (!task) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json(task);
});

export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const existing = await prisma.workshopTask.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    const isManager = ['giam_doc', 'ke_toan', 'kho'].includes(session.user.role);
    const isOwner = existing.workerId === session.user.id;
    if (!isManager && !isOwner) {
        return NextResponse.json({ error: 'Không có quyền sửa' }, { status: 403 });
    }

    const body = await request.json();
    const data = workshopTaskUpdateSchema.parse(body);

    // Worker can only update status/photos/notes of own tasks
    if (!isManager && isOwner) {
        const allowed = { status: data.status, completedPhotos: data.completedPhotos, completedNotes: data.completedNotes };
        Object.keys(allowed).forEach(k => allowed[k] === undefined && delete allowed[k]);
        if (allowed.status === 'Xong') allowed.completedAt = new Date();
        const updated = await prisma.workshopTask.update({ where: { id }, data: allowed });
        return NextResponse.json(updated);
    }

    // Manager full update
    if (data.status === 'Xong' && existing.status !== 'Xong') data.completedAt = new Date();
    const updated = await prisma.workshopTask.update({ where: { id }, data });
    return NextResponse.json(updated);
});

export const DELETE = withAuth(async (_req, { params }, session) => {
    if (!['giam_doc', 'ke_toan', 'kho'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Không có quyền xóa' }, { status: 403 });
    }
    const { id } = await params;
    await prisma.workshopTask.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
