import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const DELETE = withAuth(async (request, { params }) => {
    const { optionId } = await params;
    await prisma.productAttributeOption.delete({ where: { id: optionId } });
    return NextResponse.json({ success: true });
});
