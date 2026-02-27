import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
    const { id } = await params;
    const data = await request.json();
    const ms = await prisma.projectMilestone.update({ where: { id }, data });
    // Recalculate project progress
    const all = await prisma.projectMilestone.findMany({ where: { projectId: ms.projectId } });
    const avg = Math.round(all.reduce((s, m) => s + m.progress, 0) / all.length);
    await prisma.project.update({ where: { id: ms.projectId }, data: { progress: avg } });
    return NextResponse.json(ms);
}
