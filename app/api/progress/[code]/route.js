import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const { code } = await params;
    const project = await prisma.project.findUnique({
        where: { code },
        select: {
            id: true,
            code: true,
            name: true,
            address: true,
            area: true,
            floors: true,
            status: true,
            progress: true,
            startDate: true,
            endDate: true,
            customer: { select: { name: true } },
            // Schedule tasks (WBS) with latest progress reports
            scheduleTasks: {
                orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
                select: {
                    id: true, name: true, order: true, level: true, wbs: true,
                    startDate: true, endDate: true, duration: true,
                    progress: true, status: true, parentId: true,
                    color: true, isLocked: true, assignee: true,
                    progressReports: {
                        orderBy: { createdAt: 'desc' },
                        take: 5,
                        where: { status: 'Đã duyệt' },
                        select: {
                            id: true, progressFrom: true, progressTo: true,
                            description: true, images: true, reportDate: true,
                            createdBy: true,
                        },
                    },
                },
            },
            // Tracking logs
            trackingLogs: {
                orderBy: { createdAt: 'desc' },
                take: 20,
                select: {
                    id: true, content: true, type: true, createdAt: true,
                },
            },
            // Fallback: old milestones
            milestones: { orderBy: { order: 'asc' } },
        },
    });
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Build task tree for client
    const taskMap = new Map();
    const roots = [];
    project.scheduleTasks.forEach(t => {
        // Parse images JSON for each report
        const reports = t.progressReports.map(r => {
            let imgs = [];
            try { imgs = JSON.parse(r.images); } catch { imgs = []; }
            return { ...r, images: imgs };
        });
        taskMap.set(t.id, { ...t, progressReports: reports, children: [] });
    });
    project.scheduleTasks.forEach(t => {
        const node = taskMap.get(t.id);
        if (t.parentId && taskMap.has(t.parentId)) {
            taskMap.get(t.parentId).children.push(node);
        } else {
            roots.push(node);
        }
    });

    // "Việc đang làm tuần này"
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const thisWeekTasks = project.scheduleTasks.filter(t => {
        const start = new Date(t.startDate);
        const end = new Date(t.endDate);
        return t.status !== 'Hoàn thành' && start <= weekEnd && end >= now;
    });

    return NextResponse.json({
        code: project.code,
        name: project.name,
        address: project.address,
        area: project.area,
        floors: project.floors,
        status: project.status,
        progress: project.progress,
        customer: project.customer,
        tasks: roots,
        thisWeekTasks,
        logs: project.trackingLogs,
        milestones: project.milestones,
    });
}
