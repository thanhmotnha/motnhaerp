import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');

    const where = {};
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
        prisma.payrollRecord.findMany({
            where, skip, take: limit,
            include: {
                employee: { select: { id: true, name: true, code: true, department: true, position: true, baseSalary: true } },
            },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
        }),
        prisma.payrollRecord.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(data, total, { page, limit }));
});

// POST: Generate payroll records cho một tháng
export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { month, year, employeeIds } = body;
    if (!month || !year) return NextResponse.json({ error: 'Thiếu month/year' }, { status: 400 });

    // Lấy danh sách nhân viên
    const empWhere = { status: 'active' };
    if (employeeIds?.length) empWhere.id = { in: employeeIds };
    const employees = await prisma.employee.findMany({ where: empWhere, select: { id: true, baseSalary: true } });

    // Kiểm tra đã generate chưa
    const existing = await prisma.payrollRecord.findMany({
        where: { month: parseInt(month), year: parseInt(year), employeeId: { in: employees.map(e => e.id) } },
        select: { employeeId: true },
    });
    const existingIds = new Set(existing.map(e => e.employeeId));

    const toCreate = employees.filter(e => !existingIds.has(e.id));
    if (toCreate.length === 0) {
        return NextResponse.json({ message: 'Tất cả đã được tạo', created: 0 });
    }

    // Tính từ DailyAttendance
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const records = [];
    for (const emp of toCreate) {
        const attendances = await prisma.dailyAttendance.findMany({
            where: { employeeId: emp.id, date: { gte: startDate, lte: endDate } },
        });
        const totalWorkDays = attendances.filter(a => a.status === 'present' || a.status === 'late').length;
        const totalOT = attendances.reduce((s, a) => s + (a.overtimeHours || 0), 0);
        const baseSalary = emp.baseSalary || 0;
        const otRate = baseSalary > 0 ? (baseSalary / 26 / 8) * 1.5 : 0;
        const overtimePay = Math.round(totalOT * otRate);

        records.push({
            employeeId: emp.id,
            month: parseInt(month),
            year: parseInt(year),
            baseSalary,
            totalWorkDays,
            totalOvertimeHours: totalOT,
            overtimePay,
            grossSalary: baseSalary + overtimePay,
            netSalary: baseSalary + overtimePay, // sẽ trừ deductions khi approve
        });
    }

    const result = await prisma.payrollRecord.createMany({ data: records });
    return NextResponse.json({ message: `Đã tạo ${result.count} bảng lương`, created: result.count }, { status: 201 });
}, { roles: ['giam_doc', 'pho_gd', 'ke_toan'] });
