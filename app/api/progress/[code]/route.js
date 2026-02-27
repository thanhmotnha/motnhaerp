import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const { code } = await params;
    const project = await prisma.project.findUnique({
        where: { code },
        include: {
            customer: { select: { name: true } },
            milestones: { orderBy: { order: 'asc' } },
        },
    });
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(project);
}
