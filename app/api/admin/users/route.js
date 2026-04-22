import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { hashSync } from 'bcryptjs';
import { NextResponse } from 'next/server';

export const GET = withAuth(async () => {
    const users = await prisma.user.findMany({
        select: { id: true, email: true, username: true, name: true, role: true, active: true, phone: true, zaloUserId: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(users);
}, { roles: ['giam_doc'] });

export const POST = withAuth(async (request) => {
    const { email, username, name, password, role } = await request.json();

    if (!email || !name || !password) {
        return NextResponse.json({ error: 'email, name, password bắt buộc' }, { status: 400 });
    }

    const hashed = hashSync(password, 10);
    const usernameVal = username ? username.toLowerCase().trim() : '';

    if (usernameVal) {
        const exists = await prisma.user.findFirst({ where: { username: usernameVal } });
        if (exists) return NextResponse.json({ error: 'Username đã tồn tại' }, { status: 400 });
    }

    const user = await prisma.user.create({
        data: {
            email: email.toLowerCase().trim(),
            username: usernameVal,
            name: name.trim(),
            password: hashed,
            role: role || 'nhan_vien',
        },
        select: { id: true, email: true, username: true, name: true, role: true, active: true, phone: true, zaloUserId: true, createdAt: true },
    });
    return NextResponse.json(user, { status: 201 });
}, { roles: ['giam_doc'] });
