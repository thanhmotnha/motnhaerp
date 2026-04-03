import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const BHXH_EMP  = 0.08;
const BHYT_EMP  = 0.015;
const BHTN_EMP  = 0.01;
const BHXH_COMP = 0.215;
const STD_DAYS  = 26;

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || new Date().getMonth() + 1);
    const year  = parseInt(searchParams.get('year')  || new Date().getFullYear());

    const records = await prisma.officePayrollRecord.findMany({
        where: { month, year },
        include: {
            employee: {
                select: {
                    name: true, code: true, position: true,
                    bankAccount: true, bankName: true,
                    department: { select: { name: true } },
                },
            },
        },
        orderBy: { employee: { name: 'asc' } },
    });

    const summary = {
        totalGross:      records.reduce((s, r) => s + r.grossIncome, 0),
        totalNet:        records.reduce((s, r) => s + r.netSalary, 0),
        totalBHEmployee: records.reduce((s, r) => s + r.bhxhEmployee + r.bhytEmployee + r.bhtnEmployee, 0),
        totalBHCompany:  records.reduce((s, r) => s + r.bhxhCompany, 0),
        count:           records.length,
    };

    return NextResponse.json({ data: records, summary });
});

export const POST = withAuth(async (request) => {
    const { month, year } = await request.json();
    if (!month || !year) return NextResponse.json({ error: 'month và year bắt buộc' }, { status: 400 });

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd   = new Date(year, month, 1);

    const employees = await prisma.employee.findMany({
        where: { payrollType: 'office', deletedAt: null },
        include: {
            contractCommissions: {
                include: {
                    contract: {
                        select: { contractValue: true, variationAmount: true, createdAt: true },
                    },
                },
            },
        },
    });

    const records = [];

    for (const emp of employees) {
        const baseSalary      = emp.salary || 0;
        const insuranceBasis  = emp.insuranceSalary || baseSalary;
        const bhxhEmployee    = Math.round(insuranceBasis * BHXH_EMP);
        const bhytEmployee    = Math.round(insuranceBasis * BHYT_EMP);
        const bhtnEmployee    = Math.round(insuranceBasis * BHTN_EMP);
        const bhxhCompany     = Math.round(insuranceBasis * BHXH_COMP);

        // Commission từ hợp đồng được tạo trong tháng
        const commissionAmount = Math.round(
            emp.contractCommissions.reduce((s, cc) => {
                const contractDate = new Date(cc.contract.createdAt);
                if (contractDate >= monthStart && contractDate < monthEnd) {
                    return s + ((cc.contract.contractValue || 0) + (cc.contract.variationAmount || 0)) * cc.rate / 100;
                }
                return s;
            }, 0)
        );

        // Giữ nguyên các field nhập tay nếu record đã tồn tại
        const existing = await prisma.officePayrollRecord.findUnique({
            where: { employeeId_month_year: { employeeId: emp.id, month, year } },
            select: {
                actualDays: true, bonus: true, disciplinaryFine: true,
                salaryAdvance: true, notes: true,
                positionAllowance: true, phoneAllowance: true,
                transportAllowance: true, diligenceAllowance: true,
            },
        });

        const actualDays         = existing?.actualDays ?? STD_DAYS;
        const positionAllowance  = existing?.positionAllowance ?? emp.positionAllowance ?? 0;
        const phoneAllowance     = existing?.phoneAllowance ?? emp.phoneAllowance ?? 0;
        const transportAllowance = existing?.transportAllowance ?? emp.transportAllowance ?? 0;
        const diligenceAllowance = existing?.diligenceAllowance ?? emp.diligenceAllowance ?? 0;
        const bonus              = existing?.bonus ?? 0;
        const disciplinaryFine   = existing?.disciplinaryFine ?? 0;
        const salaryAdvance      = existing?.salaryAdvance ?? 0;

        const proratedSalary  = Math.round(baseSalary * actualDays / STD_DAYS);
        const grossIncome     = proratedSalary + positionAllowance + phoneAllowance + transportAllowance + diligenceAllowance + commissionAmount + bonus;
        const totalDeductions = bhxhEmployee + bhytEmployee + bhtnEmployee + disciplinaryFine + salaryAdvance;
        const totalCompanyPays = grossIncome + bhxhCompany;
        const netSalary       = grossIncome - totalDeductions;

        const data = {
            standardDays: STD_DAYS,
            actualDays,
            baseSalary,
            proratedSalary,
            positionAllowance,
            phoneAllowance,
            transportAllowance,
            diligenceAllowance,
            commissionAmount,
            bonus,
            grossIncome,
            bhxhEmployee,
            bhytEmployee,
            bhtnEmployee,
            bhxhCompany,
            disciplinaryFine,
            salaryAdvance,
            totalDeductions,
            totalCompanyPays,
            netSalary,
            notes: existing?.notes ?? null,
        };

        const record = await prisma.officePayrollRecord.upsert({
            where: { employeeId_month_year: { employeeId: emp.id, month, year } },
            update: {
                baseSalary:       data.baseSalary,
                proratedSalary:   data.proratedSalary,
                commissionAmount: data.commissionAmount,
                bhxhEmployee:     data.bhxhEmployee,
                bhytEmployee:     data.bhytEmployee,
                bhtnEmployee:     data.bhtnEmployee,
                bhxhCompany:      data.bhxhCompany,
                grossIncome:      data.grossIncome,
                totalDeductions:  data.totalDeductions,
                totalCompanyPays: data.totalCompanyPays,
                netSalary:        data.netSalary,
                // Do NOT overwrite: actualDays, positionAllowance, phoneAllowance,
                // transportAllowance, diligenceAllowance, bonus, disciplinaryFine, salaryAdvance, notes
            },
            create: { employeeId: emp.id, month, year, ...data },
        });
        records.push(record);
    }

    return NextResponse.json({ data: records, count: records.length }, { status: 201 });
});
