import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// UUID v4 pattern
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/public/quotations/[id]/accept
// Khách hàng chấp nhận báo giá + ký điện tử
export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { customerName, notes, shareToken, signatureData } = body;

    // Must provide valid shareToken to accept
    if (!shareToken || !UUID_RE.test(shareToken)) {
        return NextResponse.json({ error: 'Thiếu hoặc sai mã xác thực' }, { status: 403 });
    }

    const quotation = await prisma.quotation.findUnique({
        where: { id },
        select: { id: true, status: true, code: true, shareToken: true },
    });

    if (!quotation) {
        return NextResponse.json({ error: 'Báo giá không tồn tại' }, { status: 404 });
    }

    // Validate shareToken matches
    if (quotation.shareToken !== shareToken) {
        return NextResponse.json({ error: 'Mã xác thực không đúng' }, { status: 403 });
    }

    if (['Nháp', 'Hủy'].includes(quotation.status)) {
        return NextResponse.json({ error: 'Báo giá không hợp lệ để chấp nhận' }, { status: 400 });
    }
    if (quotation.status === 'Hợp đồng') {
        return NextResponse.json({ error: 'Báo giá đã được chấp nhận trước đó' }, { status: 400 });
    }

    // Extract client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';
    const now = new Date();

    const updated = await prisma.quotation.update({
        where: { id },
        data: {
            status: 'Hợp đồng',
            signedByName: customerName || 'Không rõ',
            signatureData: signatureData || '',
            signatureIp: ip,
            signedAt: now,
            notes: notes
                ? `[KH ký chấp nhận: ${customerName || 'Không rõ'} — IP: ${ip} — ${now.toLocaleString('vi-VN')}] ${notes}`
                : `[KH ký chấp nhận: ${customerName || 'Không rõ'} — IP: ${ip} — ${now.toLocaleString('vi-VN')}]`,
        },
    });

    return NextResponse.json({ success: true, code: updated.code, status: updated.status });
}, { public: true });
