// app/api/hr/contract-commissions/[id]/route.js
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.contractCommission.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
