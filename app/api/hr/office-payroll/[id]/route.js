import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { officePayrollPatchSchema } from '@/lib/validations/officePayroll';

const BHXH_EMP  = 0.08;
const BHYT_EMP  = 0.015;
const BHTN_EMP  = 0.01;
const BHXH_COMP = 0.215;
const STD_DAYS  = 26;

export const PATCH = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const patch = officePayrollPatchSchema.parse(body);

    const existing = await prisma.officePayrollRecord.findUnique({
        where: { id },
        include: {
            employee: { select: { salary: true, insuranceSalary: true } },
        },
    });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy record' }, { status: 404 });

    const baseSalary        = existing.baseSalary;
    const insuranceBasis    = existing.employee.insuranceSalary || baseSalary;
    const actualDays        = patch.actualDays ?? existing.actualDays;
    const positionAllowance = patch.positionAllowance ?? existing.positionAllowance;
    const phoneAllowance    = patch.phoneAllowance ?? existing.phoneAllowance;
    const transportAllowance = patch.transportAllowance ?? existing.transportAllowance;
    const diligenceAllowance = patch.diligenceAllowance ?? existing.diligenceAllowance;
    const bonus             = patch.bonus ?? existing.bonus;
    const disciplinaryFine  = patch.disciplinaryFine ?? existing.disciplinaryFine;
    const salaryAdvance     = patch.salaryAdvance ?? existing.salaryAdvance;

    const bhxhEmployee   = Math.round(insuranceBasis * BHXH_EMP);
    const bhytEmployee   = Math.round(insuranceBasis * BHYT_EMP);
    const bhtnEmployee   = Math.round(insuranceBasis * BHTN_EMP);
    const bhxhCompany    = Math.round(insuranceBasis * BHXH_COMP);
    const proratedSalary = Math.round(baseSalary * actualDays / STD_DAYS);
    const grossIncome    = proratedSalary + positionAllowance + phoneAllowance + transportAllowance + diligenceAllowance + existing.commissionAmount + bonus;
    const totalDeductions = bhxhEmployee + bhytEmployee + bhtnEmployee + disciplinaryFine + salaryAdvance;
    const totalCompanyPays = grossIncome + bhxhCompany;
    const netSalary      = grossIncome - totalDeductions;

    const updated = await prisma.officePayrollRecord.update({
        where: { id },
        data: {
            ...patch,
            proratedSalary,
            bhxhEmployee,
            bhytEmployee,
            bhtnEmployee,
            bhxhCompany,
            grossIncome,
            totalDeductions,
            totalCompanyPays,
            netSalary,
        },
        include: {
            employee: { select: { name: true, code: true } },
        },
    });

    return NextResponse.json(updated);
}, { roles: ["giam_doc", "ke_toan"] });
