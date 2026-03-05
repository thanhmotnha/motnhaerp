import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { workOrderUpdateSchema } from '@/lib/validations/workOrder';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const data = workOrderUpdateSchema.parse(body);
    if (data.status === 'Hoàn thành' && !data.completedAt) {
        data.completedAt = new Date();
    }

    const current = await prisma.workOrder.findUnique({
        where: { id },
        select: { status: true, scheduleTaskId: true },
    });

    const order = await prisma.workOrder.update({ where: { id }, data });

    // Auto-update linked ScheduleTask progress when WO is completed
    if (data.status === 'Hoàn thành' && current?.status !== 'Hoàn thành' && current?.scheduleTaskId) {
        // Count all WOs for this task and compute completion rate
        const allWOs = await prisma.workOrder.findMany({
            where: { scheduleTaskId: current.scheduleTaskId, deletedAt: null },
            select: { status: true },
        });
        const total = allWOs.length;
        const done = allWOs.filter(w => w.status === 'Hoàn thành').length;
        const progress = total > 0 ? Math.round((done / total) * 100) : 100;

        await prisma.scheduleTask.update({
            where: { id: current.scheduleTaskId },
            data: {
                progress,
                status: progress === 100 ? 'Hoàn thành' : progress > 0 ? 'Đang thực hiện' : 'Chưa bắt đầu',
            },
        });
    }

    return NextResponse.json(order);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.workOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
