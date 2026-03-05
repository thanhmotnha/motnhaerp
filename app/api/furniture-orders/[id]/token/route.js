import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// POST generate or refresh public customer token (TTL 72h)
export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;

    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72h

    const order = await prisma.furnitureOrder.update({
        where: { id },
        data: { publicToken: token, tokenExpiresAt },
        select: { id: true, code: true, publicToken: true, tokenExpiresAt: true },
    });

    return NextResponse.json({ token: order.publicToken, expiresAt: order.tokenExpiresAt });
}, { roles: ['giam_doc', 'pho_gd', 'quan_ly_du_an'] });

// DELETE revoke token
export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.furnitureOrder.update({
        where: { id },
        data: { publicToken: null, tokenExpiresAt: null },
    });
    return NextResponse.json({ success: true });
}, { roles: ['giam_doc', 'pho_gd'] });
