import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/warranty/check-sla
// Batch check all open tickets and mark slaBreached if past deadline
export async function POST() {
    const now = new Date();

    const result = await prisma.warrantyTicket.updateMany({
        where: {
            slaDeadline: { lt: now },
            slaBreached: false,
            status: { notIn: ['Đã xử lý', 'Đóng'] },
        },
        data: { slaBreached: true },
    });

    return NextResponse.json({ updated: result.count, checkedAt: now.toISOString() });
}
