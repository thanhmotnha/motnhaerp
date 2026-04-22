import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { sendZaloToRole, sendZaloToUsers, broadcastToAll } from '@/lib/zaloNotify';

// POST /api/admin/zalo-broadcast
// Body: { target: 'all' | 'role' | 'users', role?, userIds?, text }
export const POST = withAuth(async (request, _ctx, session) => {
    const { target, role, userIds, text } = await request.json();
    if (!text?.trim()) return NextResponse.json({ error: 'Nội dung bắt buộc' }, { status: 400 });

    const message = `📢 Từ ${session.user.name || 'Giám đốc'}:\n\n${text.trim()}`;

    let result;
    if (target === 'all') result = await broadcastToAll(message);
    else if (target === 'role' && role) result = await sendZaloToRole(role, message);
    else if (target === 'users' && Array.isArray(userIds)) result = await sendZaloToUsers(userIds, message);
    else return NextResponse.json({ error: 'target không hợp lệ' }, { status: 400 });

    return NextResponse.json(result);
}, { roles: ['giam_doc'] });

// GET — preview count of eligible recipients (có zaloUserId)
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target');
    const role = searchParams.get('role');

    const where = { active: true, zaloUserId: { not: '' } };
    if (target === 'role' && role) where.role = role;

    const count = await prisma.user.count({ where });
    return NextResponse.json({ eligibleCount: count });
}, { roles: ['giam_doc'] });
