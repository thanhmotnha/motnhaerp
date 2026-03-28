import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PATCH = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const arOpeningPaid = Number(body.arOpeningPaid);

    if (isNaN(arOpeningPaid) || arOpeningPaid < 0) {
        return NextResponse.json({ error: 'arOpeningPaid phải là số >= 0' }, { status: 400 });
    }

    const contract = await prisma.contract.findUnique({
        where: { id, deletedAt: null },
        select: { id: true },
    });
    if (!contract) {
        return NextResponse.json({ error: 'Không tìm thấy hợp đồng' }, { status: 404 });
    }

    const updated = await prisma.contract.update({
        where: { id },
        data: { arOpeningPaid },
        select: { id: true, code: true, arOpeningPaid: true },
    });

    return NextResponse.json(updated);
});
