import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const where = { projectId };
    const resourceType = searchParams.get('resourceType');
    if (resourceType) where.resourceType = resourceType;

    const items = await prisma.resourceAllocation.findMany({
        where,
        orderBy: [{ startDate: 'asc' }],
    });
    return NextResponse.json(items);
});

export const POST = withAuth(async (req) => {
    const body = await req.json();
    const {
        projectId, resourceType = 'Nhân công', resourceName,
        resourceId = '', role = '', startDate, endDate,
        hoursPerDay = 8, allocation = 100, notes = '',
    } = body;
    if (!projectId || !resourceName?.trim() || !startDate || !endDate) {
        return NextResponse.json({ error: 'projectId, resourceName, startDate, endDate là bắt buộc' }, { status: 400 });
    }
    const item = await prisma.resourceAllocation.create({
        data: {
            projectId, resourceType, resourceName: resourceName.trim(),
            resourceId, role, startDate: new Date(startDate),
            endDate: new Date(endDate), hoursPerDay, allocation, notes,
        },
    });
    return NextResponse.json(item, { status: 201 });
});
