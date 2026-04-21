import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST /api/users/push-token — save Expo push token for authenticated user
export const POST = withAuth(async (request, _ctx, session) => {
    const { pushToken } = await request.json();
    if (typeof pushToken !== 'string') {
        return NextResponse.json({ error: 'pushToken phải là string' }, { status: 400 });
    }
    await prisma.user.update({
        where: { id: session.user.id },
        data: { pushToken },
    });
    return NextResponse.json({ success: true });
});
