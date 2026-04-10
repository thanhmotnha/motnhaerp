import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month'));
    const year = parseInt(searchParams.get('year'));
    if (!month || !year) return NextResponse.json({ error: 'month và year bắt buộc' }, { status: 400 });

    const records = await prisma.workshopPayrollRecord.findMany({
        where: { month, year },
        include: {
            employee: {
                select: { id: true, name: true, code: true, department: { select: { name: true } } },
            },
        },
        orderBy: { employee: { name: 'asc' } },
    });
    return NextResponse.json({ data: records });
, { roles: ["giam_doc", "ke_toan"] });

export const POST = withAuth(async (request) => {
    const { month, year } = await request.json();
    if (!month || !year) return NextResponse.json({ error: 'month và year bắt buộc' }, { status: 400 });

    const employees = await prisma.employee.findMany({
        where: { payrollType: 'workshop', deletedAt: null },
        select: {
            id: true, salary: true, dailyWage: true,
            phoneAllowance: true, transportAllowance: true,
            diligenceAllowance: true, mealAllowanceRate: true,
        },
    });

    const records = [];
    for (const emp of employees) {
        const dailyWage = emp.dailyWage || Math.round((emp.salary || 0) / 26);

        const existing = await prisma.workshopPayrollRecord.findUnique({
            where: { employeeId_month_year: { employeeId: emp.id, month, year } },
            select: {
                overtimeHours: true, bonus: true, disciplinaryFine: true,
                salaryAdvance: true, notes: true, actualDays: true,
            },
        });

        const actualDays = existing?.actualDays ?? 26;
        const overtimeHours = existing?.overtimeHours ?? 0;
        const bonus = existing?.bonus ?? 0;
        const disciplinaryFine = existing?.disciplinaryFine ?? 0;
        const salaryAdvance = existing?.salaryAdvance ?? 0;
        const phoneAllowance = emp.phoneAllowance || 0;
        const transportAllowance = emp.transportAllowance || 0;
        const diligenceAllowance = emp.diligenceAllowance || 0;

        const basePay = dailyWage * actualDays;
        const overtimePay = Math.round(overtimeHours * (dailyWage / 8) * 1.5);
        const mealAllowance = actualDays * (emp.mealAllowanceRate || 0);
        const grossIncome = basePay + overtimePay + mealAllowance + phoneAllowance + transportAllowance + diligenceAllowance + bonus;
        const totalDeductions = disciplinaryFine + salaryAdvance;
        const netSalary = grossIncome - totalDeductions;

        const data = {
            dailyWage, actualDays, basePay,
            overtimeHours, overtimePay, mealAllowance,
            phoneAllowance, transportAllowance, diligenceAllowance,
            bonus, grossIncome, disciplinaryFine, salaryAdvance,
            totalDeductions, netSalary,
            notes: existing?.notes ?? null,
        };

        const record = await prisma.workshopPayrollRecord.upsert({
            where: { employeeId_month_year: { employeeId: emp.id, month, year } },
            update: {
                dailyWage,
                basePay,
                overtimePay,
                mealAllowance,
                phoneAllowance,
                transportAllowance,
                diligenceAllowance,
                grossIncome,
                totalDeductions,
                netSalary,
                // NOT overwriting: actualDays, overtimeHours, bonus, disciplinaryFine, salaryAdvance, notes
            },
            create: { employeeId: emp.id, month, year, ...data },
        });
        records.push(record);
    }

    return NextResponse.json({ data: records, count: records.length }, { status: 201 });
, { roles: ["giam_doc", "ke_toan"] });
