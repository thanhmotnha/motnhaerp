import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const FINANCE_ROLES = ['giam_doc', 'pho_gd', 'ke_toan'];

export const PATCH = withAuth(async (_request, { params }, session) => {
    if (!FINANCE_ROLES.includes(session.user.role)) {
        return NextResponse.json({ error: 'Không có quyền duyệt' }, { status: 403 });
    }
    const { id } = await params;
    const existing = await prisma.overheadExpense.findFirst({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (existing.status === 'approved') {
        return NextResponse.json({ error: 'Khoản đã được duyệt' }, { status: 400 });
    }
    const updated = await prisma.overheadExpense.update({
        where: { id },
        data: {
            status: 'approved',
            approvedBy: session.user.name || session.user.email || '',
            approvedAt: new Date(),
        },
    });
    return NextResponse.json(updated);
});
