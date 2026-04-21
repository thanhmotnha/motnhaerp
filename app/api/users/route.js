import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Lightweight user listing for any authenticated user.
// Returns only non-sensitive fields: id, name, email, role.
// Supports optional ?role=<role_key> filter (e.g. role=kinh_doanh).
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    const where = { active: true };
    if (role) where.role = role;

    const users = await prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: 'asc' },
    });
    return NextResponse.json({ data: users });
});
