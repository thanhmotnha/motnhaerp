import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/hr/leave-calendar?from=2025-03-01&to=2025-03-31
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
        return NextResponse.json({ error: 'from và to là bắt buộc (YYYY-MM-DD)' }, { status: 400 });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    // Lấy leave requests approved trong khoảng
    const leaveRequests = await prisma.leaveRequest.findMany({
        where: {
            status: { in: ['Đã duyệt', 'Chờ duyệt'] },
            OR: [
                { fromDate: { gte: fromDate, lte: toDate } },
                { toDate: { gte: fromDate, lte: toDate } },
                { AND: [{ fromDate: { lte: fromDate } }, { toDate: { gte: toDate } }] },
            ],
        },
        include: {
            employee: {
                select: { id: true, code: true, name: true, position: true, department: { select: { name: true } } },
            },
        },
        orderBy: { fromDate: 'asc' },
    });

    // Chấm công "Nghỉ phép" / "Nghỉ không lương" trong khoảng
    const dailyLeaves = await prisma.dailyAttendance.findMany({
        where: {
            date: { gte: fromDate, lte: toDate },
            status: { in: ['Nghỉ phép', 'Nghỉ không lương', 'Vắng'] },
        },
        include: {
            employee: {
                select: { id: true, code: true, name: true, department: { select: { name: true } } },
            },
        },
        orderBy: { date: 'asc' },
    });

    // Build calendar events
    const events = [];

    for (const lr of leaveRequests) {
        events.push({
            id: `lr-${lr.id}`,
            employeeId: lr.employee.id,
            employeeName: lr.employee.name,
            department: lr.employee.department?.name || '',
            type: lr.leaveType || 'Nghỉ phép',
            startDate: lr.fromDate,
            endDate: lr.toDate,
            days: lr.days,
            status: lr.status,
            reason: lr.reason || '',
            source: 'leave-request',
        });
    }

    for (const da of dailyLeaves) {
        events.push({
            id: `da-${da.id}`,
            employeeId: da.employee.id,
            employeeName: da.employee.name,
            department: da.employee.department?.name || '',
            type: da.status,
            startDate: da.date,
            endDate: da.date,
            days: 1,
            status: 'Xác nhận',
            reason: da.notes || '',
            source: 'daily-attendance',
        });
    }

    return NextResponse.json({ data: events, count: events.length });
});
