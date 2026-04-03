import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month'));
    const year = parseInt(searchParams.get('year'));
    if (!month || !year) return NextResponse.json({ error: 'month và year bắt buộc' }, { status: 400 });

    const records = await prisma.workshopPayrollRecord.findMany({
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
        'Lương/ngày': r.dailyWage,
        'Ngày TT': r.actualDays,
        'Lương ngày công': r.basePay,
        'OT (giờ)': r.overtimeHours,
        'Tiền OT': r.overtimePay,
        'Tiền ăn': r.mealAllowance,
        'PC Điện thoại': r.phoneAllowance,
        'PC Xăng xe': r.transportAllowance,
        'PC Chuyên cần': r.diligenceAllowance,
        'Thưởng': r.bonus,
        'Gross': r.grossIncome,
        'Phạt': r.disciplinaryFine,
        'Tạm ứng': r.salaryAdvance,
        'Tổng khấu trừ': r.totalDeductions,
        'Còn lĩnh': r.netSalary,
        'Ghi chú': r.notes || '',
    }));

    const summary = records.map((r, i) => ({
        'STT': i + 1,
        'Họ tên': r.employee.name,
        'Ngày công': r.actualDays,
        'OT (giờ)': r.overtimeHours,
        'Gross': r.grossIncome,
        'Còn lĩnh': r.netSalary,
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
            'Content-Disposition': `attachment; filename="bang-luong-xuong-T${month}-${year}.xlsx"`,
        },
    });
});
