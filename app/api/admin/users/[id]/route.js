import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { hashSync } from 'bcryptjs';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { name, role, active, password } = await request.json();

    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (role !== undefined) data.role = role;
    if (active !== undefined) data.active = active;
    if (password) data.password = hashSync(password, 10);

    const user = await prisma.user.update({
        where: { id },
        data,
        select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
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
