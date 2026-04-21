import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/activityLogger';

const FINANCE_ROLES = ['giam_doc', 'ke_toan'];

// PATCH — hoàn duyệt (approved → draft)
export const PATCH = withAuth(async (_request, { params }, session) => {
    if (!FINANCE_ROLES.includes(session.user.role)) {
        return NextResponse.json({ error: 'Không có quyền hoàn duyệt' }, { status: 403 });
    }
    const { id } = await params;
    const existing = await prisma.overheadExpense.findFirst({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (existing.status !== 'approved') {
        return NextResponse.json({ error: 'Chỉ hoàn duyệt được khoản đang ở trạng thái Đã duyệt' }, { status: 400 });
    }
    const updated = await prisma.overheadExpense.update({
        where: { id },
        data: { status: 'draft', approvedBy: '', approvedAt: null },
    });
    await logActivity({
        action: 'UNAPPROVE',
        entityType: 'OverheadExpense',
        entityId: id,
        entityLabel: existing.description,
        actor: session.user.name || session.user.email || '',
        actorId: session.user.id,
    });
    return NextResponse.json(updated);
});
