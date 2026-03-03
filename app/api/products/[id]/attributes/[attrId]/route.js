import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const DELETE = withAuth(async (request, { params }) => {
    const { attrId } = await params;
    await prisma.productAttribute.delete({ where: { id: attrId } });
    return NextResponse.json({ success: true });
});
