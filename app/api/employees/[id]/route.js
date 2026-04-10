import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { employeeUpdateSchema } from '@/lib/validations/employee';

// GET /api/employees/[id] — Employee Profile (full info + attendance this month)
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [employee, monthAttendance, leaveThisYear] = await Promise.all([
        prisma.employee.findUnique({
            where: { id },
            include: {
                department: true,
                attendanceRecords: {
                    where: { date: { gte: startOfMonth } },
                    orderBy: { date: 'desc' },
                    take: 31,
                },
            },
        }),
        prisma.dailyAttendance.groupBy({
            by: ['status'],
            where: { employeeId: id, date: { gte: startOfMonth } },
            _count: true,
        }).catch(() => []),
        prisma.leaveRequest.aggregate({
            where: {
                employeeId: id,
                status: 'Đã duyệt',
                fromDate: { gte: new Date(now.getFullYear(), 0, 1) },
            },
            _sum: { days: true },
        }).catch(() => ({ _sum: { days: 0 } })),
    ]);

    if (!employee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const attendanceSummary = {};
    for (const a of monthAttendance) {
        attendanceSummary[a.status] = a._count;
    }

    return NextResponse.json({
        ...employee,
        attendanceSummary,
        leaveTakenThisYear: leaveThisYear._sum.days || 0,
    });
}, { roles: ['giam_doc', 'ke_toan'] });

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const data = employeeUpdateSchema.parse(body);
    const employee = await prisma.employee.update({ where: { id }, data });
    return NextResponse.json(employee);
}, { roles: ['giam_doc', 'ke_toan'] });

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.employee.update({ where: { id }, data: { deletedAt: new Date(), status: 'Nghỉ việc' } });
    return NextResponse.json({ success: true });
}, { roles: ['giam_doc', 'ke_toan'] });
