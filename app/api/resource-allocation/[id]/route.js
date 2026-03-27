import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (req, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const data = {};
    if (body.resourceType !== undefined) data.resourceType = body.resourceType;
    if (body.resourceName !== undefined) data.resourceName = body.resourceName;
    if (body.resourceId !== undefined) data.resourceId = body.resourceId;
    if (body.role !== undefined) data.role = body.role;
    if (body.startDate !== undefined) data.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) data.endDate = new Date(body.endDate);
    if (body.hoursPerDay !== undefined) data.hoursPerDay = body.hoursPerDay;
    if (body.allocation !== undefined) data.allocation = body.allocation;
    if (body.notes !== undefined) data.notes = body.notes;

    const item = await prisma.resourceAllocation.update({ where: { id }, data });
    return NextResponse.json(item);
});

export const DELETE = withAuth(async (req, { params }) => {
    const { id } = await params;
    await prisma.resourceAllocation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
});
