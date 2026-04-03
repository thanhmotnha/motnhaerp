import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month'));
    const year = parseInt(searchParams.get('year'));
    if (!month || !year) return NextResponse.json({ error: 'month và year bắt buộc' }, { status: 400 });

    const records = await prisma.officePayrollRecord.findMany({
        where: { month, year },
        include: {
            employee: {
                select: { name: true, code: true, department: { select: { name: true } } },
            },
        },
        orderBy: { employee: { name: 'asc' } },
    });

    const detail = records.map((r, i) => ({
        'STT': i + 1,
        'Mã NV': r.employee.code,
        'Họ tên': r.employee.name,
        'Phòng ban': r.employee.department?.name || '',
        'Lương CB': r.baseSalary,
        'Ngày chuẩn': r.standardDays,
        'Ngày TT': r.actualDays,
        'Lương tính ngày': r.proratedSalary,
        'PC Điện thoại': r.phoneAllowance,
        'PC Xăng xe': r.transportAllowance,
        'PC Chuyên cần': r.diligenceAllowance,
        'PC Chức vụ': r.positionAllowance,
        'Hoa hồng KD': r.commissionAmount,
        'Thưởng': r.bonus,
        'Gross': r.grossIncome,
        'BHXH NLĐ 8%': r.bhxhEmployee,
        'BHYT NLĐ 1.5%': r.bhytEmployee,
        'BHTN NLĐ 1%': r.bhtnEmployee,
        'BHXH NSDLĐ 21.5%': r.bhxhCompany,
        'Phạt': r.disciplinaryFine,
        'Tạm ứng': r.salaryAdvance,
        'Tổng khấu trừ': r.totalDeductions,
        'Còn lĩnh': r.netSalary,
        'Ghi chú': r.notes || '',
    }));

    const summary = records.map((r, i) => ({
        'STT': i + 1,
        'Họ tên': r.employee.name,
        'Gross': r.grossIncome,
        'BH NLĐ': r.bhxhEmployee + r.bhytEmployee + r.bhtnEmployee,
        'Còn lĩnh': r.netSalary,
        'BH NSDLĐ': r.bhxhCompany,
        'Chi phí công ty': r.totalCompanyPays,
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(detail);
    XLSX.utils.book_append_sheet(wb, ws1, 'Chi tiết');
    const ws2 = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, ws2, 'Tổng hợp');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="bang-luong-VP-T${month}-${year}.xlsx"`,
        },
    });
});
