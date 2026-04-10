import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// DELETE /api/furniture-orders/[id]/files/[fid]
export const DELETE = withAuth(async (request, { params }) => {
    const { fid } = await params;
    await prisma.furnitureFile.delete({ where: { id: fid } });
    return NextResponse.json({ ok: true });
});
