import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || new Date().getMonth() + 1);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear());

    const [employees, attendances] = await Promise.all([
        prisma.employee.findMany({
            where: { status: 'Đang làm', deletedAt: null },
            select: { id: true, code: true, name: true, position: true, salary: true, insuranceSalary: true, department: { select: { name: true } } },
            orderBy: { name: 'asc' },
        }),
        prisma.attendance.findMany({
            where: { month, year },
            select: { id: true, employeeId: true, workDays: true, leaveDays: true, unpaidDays: true, overtimeHrs: true, bonus: true, deduction: true, netSalary: true, notes: true },
        }),
    ]);

    const attMap = Object.fromEntries(attendances.map(a => [a.employeeId, a]));

    // Standard work days in month (approx)
    const totalWorkdays = getWorkdaysInMonth(year, month);

    const result = employees.map(e => {
        const att = attMap[e.id] || null;
        const baseSalary = e.salary || 0;
        const workDays = att?.workDays ?? totalWorkdays;
        const unpaidDays = att?.unpaidDays ?? 0;
        const overtimeHrs = att?.overtimeHrs ?? 0;
        const bonus = att?.bonus ?? 0;
        const deduction = att?.deduction ?? 0;
        // Auto-calculate net salary if not overridden
        const dailySalary = baseSalary / totalWorkdays;
        const bhxh = Math.round((e.insuranceSalary || baseSalary) * 0.105);
        const autoNet = (dailySalary * workDays) - (dailySalary * unpaidDays) + (dailySalary / 8 * 1.5 * overtimeHrs) + bonus - deduction - bhxh;
        return {
            ...e,
            totalWorkdays,
            attendance: att,
            workDays,
            leaveDays: att?.leaveDays ?? 0,
            unpaidDays,
            overtimeHrs,
            bonus,
            deduction,
            netSalary: att?.netSalary || Math.round(autoNet),
            notes: att?.notes ?? '',
        };
    });

    return NextResponse.json({ month, year, totalWorkdays, employees: result });
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { employeeId, month, year, workDays, leaveDays, unpaidDays, overtimeHrs, bonus, deduction, netSalary, notes } = body;

    const att = await prisma.attendance.upsert({
        where: { employeeId_month_year: { employeeId, month, year } },
        update: { workDays, leaveDays, unpaidDays, overtimeHrs, bonus, deduction, netSalary, notes },
        create: { employeeId, month, year, workDays, leaveDays, unpaidDays, overtimeHrs, bonus, deduction, netSalary, notes },
    });
    return NextResponse.json(att);
});

function getWorkdaysInMonth(year, month) {
    const days = new Date(year, month, 0).getDate(); // total days
    let workdays = 0;
    for (let d = 1; d <= days; d++) {
        const dow = new Date(year, month - 1, d).getDay();
        if (dow !== 0 && dow !== 6) workdays++;
    }
    return workdays;
}
