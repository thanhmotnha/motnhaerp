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

    // Fetch current leave to detect status transition
    const current = await prisma.leaveRequest.findUnique({ where: { id } });

    const leaveRequest = await prisma.leaveRequest.update({ where: { id }, data });

    // Auto-adjust attendance when status transitions to "Đã duyệt"
    if (body.status === 'Đã duyệt' && current?.status !== 'Đã duyệt') {
        const startDate = data.startDate || current.startDate;
        const leaveDays = data.days ?? current.days ?? 1;
        const leaveType = data.type || current.type || '';
        const isUnpaid = leaveType.toLowerCase().includes('không lương');

        const month = startDate.getMonth() + 1;
        const year = startDate.getFullYear();

        const existing = await prisma.attendance.findUnique({
            where: { employeeId_month_year: { employeeId: current.employeeId, month, year } },
        });

        if (existing) {
            await prisma.attendance.update({
                where: { employeeId_month_year: { employeeId: current.employeeId, month, year } },
                data: {
                    leaveDays: (existing.leaveDays || 0) + leaveDays,
                    ...(isUnpaid && { unpaidDays: (existing.unpaidDays || 0) + leaveDays }),
                },
            });
        } else {
            const daysInMonth = new Date(year, month, 0).getDate();
            let workdays = 0;
            for (let d = 1; d <= daysInMonth; d++) {
                const dow = new Date(year, month - 1, d).getDay();
                if (dow !== 0 && dow !== 6) workdays++;
            }
            await prisma.attendance.create({
                data: {
                    employeeId: current.employeeId,
                    month,
                    year,
                    workDays: workdays,
                    leaveDays,
                    unpaidDays: isUnpaid ? leaveDays : 0,
                },
            });
        }
    }

    return NextResponse.json(leaveRequest);
});

export const DELETE = withAuth(async (req, { params }) => {
    const { id } = await params;
    await prisma.leaveRequest.delete({ where: { id } });
    return NextResponse.json({ ok: true });
});
