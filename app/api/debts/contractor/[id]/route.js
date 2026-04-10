import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { contractorDebtUpdateSchema } from '@/lib/validations/debt';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const debt = await prisma.contractorDebt.findUnique({
        where: { id },
        include: {
            contractor: { select: { id: true, code: true, name: true } },
            project: { select: { id: true, code: true, name: true } },
            payments: { orderBy: { date: 'asc' } },
        },
    });
    if (!debt) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json({ ...debt, remaining: debt.totalAmount - debt.paidAmount });
, { roles: ["giam_doc", "ke_toan"] });

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const data = contractorDebtUpdateSchema.parse(body);
    const debt = await prisma.contractorDebt.update({ where: { id }, data });
    return NextResponse.json({ ...debt, remaining: debt.totalAmount - debt.paidAmount });
, { roles: ["giam_doc", "ke_toan"] });

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const debt = await prisma.contractorDebt.findUnique({ where: { id }, select: { paidAmount: true } });
    if (!debt) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (debt.paidAmount > 0) return NextResponse.json({ error: 'Không thể xóa — đã có thanh toán' }, { status: 400 });
    await prisma.contractorDebt.delete({ where: { id } });
    return NextResponse.json({ success: true });
, { roles: ["giam_doc", "ke_toan"] });
