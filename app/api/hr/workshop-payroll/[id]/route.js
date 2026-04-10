import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { workshopPayrollPatchSchema } from '@/lib/validations/workshopPayroll';

export const PATCH = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const patch = workshopPayrollPatchSchema.parse(body);

    const existing = await prisma.workshopPayrollRecord.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy record' }, { status: 404 });

    const actualDays = patch.actualDays ?? existing.actualDays;
    const dailyWage = existing.dailyWage;
    const overtimeHours = patch.overtimeHours ?? existing.overtimeHours;
    const mealAllowance = patch.mealAllowance ?? existing.mealAllowance;
    const phoneAllowance = patch.phoneAllowance ?? existing.phoneAllowance;
    const transportAllowance = patch.transportAllowance ?? existing.transportAllowance;
    const diligenceAllowance = patch.diligenceAllowance ?? existing.diligenceAllowance;
    const bonus = patch.bonus ?? existing.bonus;
    const disciplinaryFine = patch.disciplinaryFine ?? existing.disciplinaryFine;
    const salaryAdvance = patch.salaryAdvance ?? existing.salaryAdvance;

    const basePay = dailyWage * actualDays;
    const overtimePay = Math.round(overtimeHours * (dailyWage / 8) * 1.5);
    const grossIncome = basePay + overtimePay + mealAllowance + phoneAllowance + transportAllowance + diligenceAllowance + bonus;
    const totalDeductions = disciplinaryFine + salaryAdvance;
    const netSalary = grossIncome - totalDeductions;

    const updated = await prisma.workshopPayrollRecord.update({
        where: { id },
        data: {
            ...patch,
            basePay,
            overtimePay,
            grossIncome,
            totalDeductions,
            netSalary,
        },
        include: { employee: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json(updated);
}, { roles: ["giam_doc", "ke_toan"] });
