import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const where = {};
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    if (month && year) {
        const from = new Date(parseInt(year), parseInt(month) - 1, 1);
        const to = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
        where.startDate = { lte: to };
        where.endDate = { gte: from };
    }

    const requests = await prisma.leaveRequest.findMany({
        where,
        include: {
            employee: { select: { id: true, code: true, name: true, department: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(requests);
});

export const POST = withAuth(async (req) => {
    const body = await req.json();
    const { employeeId, type = 'Nghỉ phép năm', startDate, endDate, days, reason = '' } = body;
    if (!employeeId || !startDate || !endDate) {
        return NextResponse.json({ error: 'employeeId, startDate, endDate là bắt buộc' }, { status: 400 });
    }
    const request = await prisma.leaveRequest.create({
        data: {
            employeeId, type,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            days: parseFloat(days) || 1,
            reason,
        },
    });
    return NextResponse.json(request, { status: 201 });
});
