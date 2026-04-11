import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (request, { params }) => {
    const { selId } = await params;

    const sel = await prisma.materialSelection.findUnique({
        where: { id: selId },
        select: { id: true, furnitureOrderId: true },
    });
    if (!sel) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 ngày

    await prisma.materialSelection.update({
        where: { id: selId },
        data: {
            confirmationToken: token,
            selTokenExpiresAt: expiresAt,
        },
    });

    const url = `/public/material-confirmation/${token}`;
    return NextResponse.json({ token, url, expiresAt });
});
