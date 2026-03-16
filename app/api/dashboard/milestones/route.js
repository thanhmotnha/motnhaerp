import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async () => {
    const now = new Date();
    const in14days = new Date(now);
    in14days.setDate(in14days.getDate() + 14);

    const [commitments, workOrders, contractPayments] = await Promise.all([
        // Commitments pending with deadline in next 14 days
        prisma.commitment.findMany({
            where: {
                status: { not: 'done' },
                deadline: { gte: now, lte: in14days },
            },
            select: { id: true, title: true, deadline: true, project: { select: { id: true, name: true } } },
            orderBy: { deadline: 'asc' },
            take: 10,
        }),
        // Work orders pending with dueDate in next 14 days
        prisma.workOrder.findMany({
            where: {
                status: { not: 'Hoàn thành' },
                dueDate: { gte: now, lte: in14days },
            },
            select: { id: true, code: true, title: true, dueDate: true, project: { select: { id: true, name: true } } },
            orderBy: { dueDate: 'asc' },
            take: 10,
        }),
        // Contract payments due in next 14 days
        prisma.contractPayment.findMany({
            where: {
                status: { not: 'Đã thu' },
                dueDate: { gte: now, lte: in14days },
            },
            select: { id: true, phase: true, amount: true, dueDate: true, contract: { select: { name: true, project: { select: { id: true, name: true } } } } },
            orderBy: { dueDate: 'asc' },
            take: 10,
        }),
    ]);

    const milestones = [
        ...commitments.map(c => ({
            id: c.id,
            type: 'commitment',
            title: c.title,
            subTitle: c.project?.name,
            dueDate: c.deadline,
            href: `/projects/${c.project?.id}`,
        })),
        ...workOrders.map(w => ({
            id: w.id,
            type: 'workorder',
            title: `WO ${w.code}: ${w.title}`,
            subTitle: w.project?.name,
            dueDate: w.dueDate,
            href: `/work-orders/${w.id}`,
        })),
        ...contractPayments.map(p => ({
            id: p.id,
            type: 'payment',
            title: `Thu ${p.phase}: ${new Intl.NumberFormat('vi-VN').format(p.amount)}đ`,
            subTitle: p.contract?.project?.name || p.contract?.name,
            dueDate: p.dueDate,
            href: p.contract?.project?.id ? `/projects/${p.contract.project.id}` : '#',
        })),
    ].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 15);

    return NextResponse.json(milestones);
});
