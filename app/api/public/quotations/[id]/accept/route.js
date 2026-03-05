import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST /api/public/quotations/[id]/accept
// Khách hàng chấp nhận báo giá — không cần auth
export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { customerName, notes } = body;

    const quotation = await prisma.quotation.findUnique({
        where: { id },
        select: { id: true, status: true, code: true },
    });

    if (!quotation) {
        return NextResponse.json({ error: 'Báo giá không tồn tại' }, { status: 404 });
    }
    if (['Nháp', 'Hủy'].includes(quotation.status)) {
        return NextResponse.json({ error: 'Báo giá không hợp lệ để chấp nhận' }, { status: 400 });
    }
    if (quotation.status === 'Hợp đồng') {
        return NextResponse.json({ error: 'Báo giá đã được chấp nhận trước đó' }, { status: 400 });
    }

    const updated = await prisma.quotation.update({
        where: { id },
        data: {
            status: 'Hợp đồng',
            notes: notes ? `[KH chấp nhận: ${customerName || 'Không rõ'}] ${notes}` : undefined,
        },
    });

    return NextResponse.json({ success: true, code: updated.code, status: updated.status });
}, { public: true });
