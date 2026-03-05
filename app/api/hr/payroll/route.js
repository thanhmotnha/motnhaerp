import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const BHXH_RATE_EMP = 0.08;
const BHYT_RATE_EMP = 0.015;
const BHTN_RATE_EMP = 0.01;
const BHXH_RATE_COMP = 0.175;
const PERSONAL_DEDUCTION = 11000000; // 11 triệu
const DEPENDENT_DEDUCTION = 4400000; // 4.4 triệu/người phụ thuộc

// POST /api/hr/payroll — Tạo bảng lương tháng
export const POST = withAuth(async (request, context, session) => {
    const { month, year } = await request.json();

    if (!month || !year) {
        return NextResponse.json({ error: 'Thiếu tháng/năm' }, { status: 400 });
    }

    // Get all active employees with attendance
    const employees = await prisma.employee.findMany({
        where: { status: 'Đang làm', deletedAt: null },
        select: {
            id: true, name: true, code: true, salary: true, insuranceSalary: true,
            attendances: { where: { month, year } },
        },
    });

    const records = [];

    for (const emp of employees) {
        const att = emp.attendances[0];
        const baseSalary = emp.salary || 0;
        const insuranceSalary = emp.insuranceSalary || baseSalary;
        const workDays = 26; // standard
        const actualDays = att?.workDays || workDays;
        const overtimeHrs = att?.overtimeHrs || 0;

        // Prorated salary
        const proratedSalary = baseSalary * (actualDays / workDays);
        const overtimePay = (baseSalary / workDays / 8) * 1.5 * overtimeHrs;

        // Insurance (employee portion)
        const bhxhEmp = insuranceSalary * BHXH_RATE_EMP;
        const bhytEmp = insuranceSalary * BHYT_RATE_EMP;
        const bhtnEmp = insuranceSalary * BHTN_RATE_EMP;
        const bhxhComp = insuranceSalary * BHXH_RATE_COMP;

        // Allowances & bonus
        const allowances = 0;
        const bonus = att?.bonus || 0;
        const deductions = att?.deduction || 0;

        // Taxable income
        const grossIncome = proratedSalary + overtimePay + allowances + bonus;
        const totalInsuranceEmp = bhxhEmp + bhytEmp + bhtnEmp;
        const taxableIncome = Math.max(0, grossIncome - totalInsuranceEmp - PERSONAL_DEDUCTION);

        // Personal income tax (simplified progressive)
        let tax = 0;
        if (taxableIncome > 0) {
            if (taxableIncome <= 5000000) tax = taxableIncome * 0.05;
            else if (taxableIncome <= 10000000) tax = 250000 + (taxableIncome - 5000000) * 0.1;
            else if (taxableIncome <= 18000000) tax = 750000 + (taxableIncome - 10000000) * 0.15;
            else if (taxableIncome <= 32000000) tax = 1950000 + (taxableIncome - 18000000) * 0.2;
            else if (taxableIncome <= 52000000) tax = 4750000 + (taxableIncome - 32000000) * 0.25;
            else if (taxableIncome <= 80000000) tax = 9750000 + (taxableIncome - 52000000) * 0.3;
            else tax = 18150000 + (taxableIncome - 80000000) * 0.35;
        }

        const netSalary = grossIncome - totalInsuranceEmp - tax - deductions;

        // Upsert payroll record
        const record = await prisma.payrollRecord.upsert({
            where: { employeeId_month_year: { employeeId: emp.id, month, year } },
            create: {
                employeeId: emp.id, month, year,
                baseSalary, workDays, actualDays, overtimeHours: overtimeHrs, overtimePay,
                allowances, bonus,
                bhxhEmployee: bhxhEmp, bhxhCompany: bhxhComp,
                bhytEmployee: bhytEmp, bhtnEmployee: bhtnEmp,
                taxableIncome, personalTax: Math.round(tax),
                deductions, netSalary: Math.round(netSalary),
            },
            update: {
                baseSalary, workDays, actualDays, overtimeHours: overtimeHrs, overtimePay,
                allowances, bonus,
                bhxhEmployee: bhxhEmp, bhxhCompany: bhxhComp,
                bhytEmployee: bhytEmp, bhtnEmployee: bhtnEmp,
                taxableIncome, personalTax: Math.round(tax),
                deductions, netSalary: Math.round(netSalary),
            },
        });

        records.push({ ...record, employeeName: emp.name, employeeCode: emp.code });
    }

    const totalNet = records.reduce((s, r) => s + r.netSalary, 0);
    const totalGross = records.reduce((s, r) => s + r.baseSalary, 0);
    const totalTax = records.reduce((s, r) => s + r.personalTax, 0);
    const totalInsurance = records.reduce((s, r) => s + r.bhxhEmployee + r.bhytEmployee + r.bhtnEmployee + r.bhxhCompany, 0);

    return NextResponse.json({
        data: records,
        summary: { count: records.length, totalGross, totalNet, totalTax, totalInsurance },
    });
}, { roles: ['giam_doc', 'ke_toan'] });

// GET /api/hr/payroll — Lấy bảng lương
export const GET = withAuth(async (request, context, session) => {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || new Date().getMonth() + 1);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear());

    const records = await prisma.payrollRecord.findMany({
        where: { month, year },
        include: {
            employee: { select: { name: true, code: true, position: true } },
        },
        orderBy: { employee: { name: 'asc' } },
    });

    const totalNet = records.reduce((s, r) => s + r.netSalary, 0);
    const totalGross = records.reduce((s, r) => s + r.baseSalary, 0);
    const totalTax = records.reduce((s, r) => s + r.personalTax, 0);

    return NextResponse.json({
        data: records, month, year,
        summary: { count: records.length, totalGross, totalNet, totalTax },
    });
}, { roles: ['giam_doc', 'ke_toan'] });
