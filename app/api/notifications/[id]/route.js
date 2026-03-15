import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// PATCH /api/notifications/[id] — mark as read
export const PATCH = withAuth(async (request, { params }) => {
    const { id } = await params;
    const notification = await prisma.notification.update({
        where: { id },
        data: { isRead: true, readAt: new Date() },
    });
    return NextResponse.json(notification);
});
