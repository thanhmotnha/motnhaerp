import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { overheadExpenseUpdateSchema } from '@/lib/validations/overhead';
import { logActivity } from '@/lib/activityLogger';

export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const existing = await prisma.overheadExpense.findFirst({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (existing.status === 'approved') {
        return NextResponse.json({ error: 'Không thể sửa khoản đã duyệt' }, { status: 400 });
    }
    const { status: _status, ...data } = overheadExpenseUpdateSchema.parse(await request.json());
    const updated = await prisma.overheadExpense.update({
        where: { id },
        data,
        include: { category: { select: { id: true, name: true } } },
    });
    await logActivity({
        action: 'UPDATE',
        entityType: 'OverheadExpense',
        entityId: id,
        entityLabel: updated.description,
        actor: session.user.name || session.user.email || '',
        actorId: session.user.id,
    });
    return NextResponse.json(updated);
}, { roles: ["giam_doc", "ke_toan"] });

export const DELETE = withAuth(async (_request, { params }, session) => {
    const { id } = await params;
    const existing = await prisma.overheadExpense.findFirst({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (existing.status === 'approved') {
        return NextResponse.json({ error: 'Không thể xóa khoản đã duyệt' }, { status: 400 });
    }
    await prisma.overheadExpense.update({ where: { id }, data: { deletedAt: new Date() } });
    await logActivity({
        action: 'DELETE',
        entityType: 'OverheadExpense',
        entityId: id,
        entityLabel: existing.description,
        actor: session.user.name || session.user.email || '',
        actorId: session.user.id,
    });
    return NextResponse.json({ success: true });
}, { roles: ["giam_doc", "ke_toan"] });
