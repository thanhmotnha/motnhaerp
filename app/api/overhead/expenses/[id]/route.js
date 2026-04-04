import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { overheadExpenseUpdateSchema } from '@/lib/validations/overhead';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const existing = await prisma.overheadExpense.findFirst({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (existing.status === 'approved') {
        return NextResponse.json({ error: 'Không thể sửa khoản đã duyệt' }, { status: 400 });
    }
    const data = overheadExpenseUpdateSchema.parse(await request.json());
    const updated = await prisma.overheadExpense.update({
        where: { id },
        data,
        include: { category: { select: { id: true, name: true } } },
    });
    return NextResponse.json(updated);
});

export const DELETE = withAuth(async (_request, { params }) => {
    const { id } = await params;
    const existing = await prisma.overheadExpense.findFirst({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (existing.status === 'approved') {
        return NextResponse.json({ error: 'Không thể xóa khoản đã duyệt' }, { status: 400 });
    }
    await prisma.overheadExpense.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ success: true });
});
