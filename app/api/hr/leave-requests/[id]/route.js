import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (req, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const data = {};
    const fields = ['type', 'startDate', 'endDate', 'days', 'reason', 'status', 'approvedBy', 'rejectNote'];
    fields.forEach(f => { if (body[f] !== undefined) data[f] = body[f]; });
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);
    if (data.days) data.days = parseFloat(data.days);
    if (body.status === 'Đã duyệt') data.approvedAt = new Date();
    const request = await prisma.leaveRequest.update({ where: { id }, data });
    return NextResponse.json(request);
});

export const DELETE = withAuth(async (req, { params }) => {
    const { id } = await params;
    await prisma.leaveRequest.delete({ where: { id } });
    return NextResponse.json({ ok: true });
});
