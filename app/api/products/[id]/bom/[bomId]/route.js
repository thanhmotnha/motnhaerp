import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const DELETE = withAuth(async (request, { params }) => {
    const { bomId } = await params;
    await prisma.productBOM.delete({ where: { id: bomId } });
    return NextResponse.json({ success: true });
});
