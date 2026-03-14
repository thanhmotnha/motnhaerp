import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Public GET - no auth required (for shared contract links)
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const contract = await prisma.contract.findUnique({
        where: { id },
        include: {
            customer: { select: { name: true, phone: true, email: true, address: true, citizenId: true } },
            project: { select: { name: true, address: true, code: true } },
            quotation: { select: { code: true, type: true, grandTotal: true } },
            payments: { orderBy: { createdAt: 'asc' } },
            addenda: { orderBy: { createdAt: 'asc' } },
        },
    });
    if (!contract || contract.status === 'Nháp' || contract.deletedAt) {
        return NextResponse.json({ error: 'Hợp đồng không tồn tại' }, { status: 404 });
    }

    // Track view (non-blocking)
    prisma.contract.update({
        where: { id },
        data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
    }).catch(() => { });

    return NextResponse.json(contract);
}, { public: true });
