import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_req, { params }) => {
    const { id } = await params;
    const record = await prisma.payrollRecord.findUnique({
        where: { id },
        include: {
            employee: { select: { id: true, name: true, code: true, department: true, position: true, bankAccount: true, bankName: true } },
        },
    });
    if (!record) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json(record);
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const updateData = {};

    // Cập nhật các khoản phụ cấp, thưởng, khấu trừ
    if (body.allowances !== undefined) updateData.allowances = body.allowances;
    if (body.bonuses !== undefined) updateData.bonuses = body.bonuses;
    if (body.deductions !== undefined) updateData.deductions = body.deductions;
    if (body.insuranceDeduction !== undefined) updateData.insuranceDeduction = body.insuranceDeduction;
    if (body.taxDeduction !== undefined) updateData.taxDeduction = body.taxDeduction;
    if (body.advanceDeduction !== undefined) updateData.advanceDeduction = body.advanceDeduction;
    if (body.note !== undefined) updateData.note = body.note;

    // Recalc nếu cần
    const current = await prisma.payrollRecord.findUnique({ where: { id } });
    if (current) {
        const gross = (current.baseSalary || 0) + (current.overtimePay || 0) +
            (updateData.allowances ?? current.allowances ?? 0) +
            (updateData.bonuses ?? current.bonuses ?? 0);
        const totalDeduct = (updateData.deductions ?? current.deductions ?? 0) +
            (updateData.insuranceDeduction ?? current.insuranceDeduction ?? 0) +
            (updateData.taxDeduction ?? current.taxDeduction ?? 0) +
            (updateData.advanceDeduction ?? current.advanceDeduction ?? 0);
        updateData.grossSalary = gross;
        updateData.netSalary = gross - totalDeduct;
    }

    // Workflow: approve / pay
    if (body.status === 'approved') {
        updateData.status = 'approved';
        updateData.approvedBy = body.approvedBy || request.user?.name || '';
        updateData.approvedAt = new Date();
    } else if (body.status === 'paid') {
        updateData.status = 'paid';
        updateData.paidAt = new Date();
        updateData.paidBy = body.paidBy || request.user?.name || '';
    }

    const record = await prisma.payrollRecord.update({ where: { id }, data: updateData });
    return NextResponse.json(record);
}, { roles: ['giam_doc', 'ke_toan'] });
