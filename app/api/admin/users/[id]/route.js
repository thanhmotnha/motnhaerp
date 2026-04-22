import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { hashSync } from 'bcryptjs';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { name, username, role, active, password, phone, zaloUserId } = await request.json();

    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (username !== undefined) {
        const val = username.toLowerCase().trim();
        data.username = val;
        if (val) {
            const dup = await prisma.user.findFirst({ where: { username: val, id: { not: id } } });
            if (dup) return NextResponse.json({ error: 'Username đã tồn tại' }, { status: 400 });
        }
    }
    if (role !== undefined) data.role = role;
    if (active !== undefined) data.active = active;
    if (password) data.password = hashSync(password, 10);
    if (phone !== undefined) data.phone = phone.trim();
    if (zaloUserId !== undefined) data.zaloUserId = zaloUserId.trim();

    const user = await prisma.user.update({
        where: { id },
        data,
        select: { id: true, email: true, username: true, name: true, role: true, active: true, phone: true, zaloUserId: true, createdAt: true },
    });
    return NextResponse.json(user);
}, { roles: ['giam_doc'] });

export const DELETE = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    if (id === session.user.id) {
        return NextResponse.json({ error: 'Không thể xóa tài khoản đang đăng nhập' }, { status: 400 });
    }
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}, { roles: ['giam_doc'] });
