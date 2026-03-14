import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST /api/public/contracts/[id]/accept
// Khách hàng ký xác nhận hợp đồng — không cần auth
export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { customerName, notes, signatureData } = body;

    const contract = await prisma.contract.findUnique({
        where: { id },
        select: { id: true, status: true, code: true, deletedAt: true },
    });

    if (!contract || contract.deletedAt) {
        return NextResponse.json({ error: 'Hợp đồng không tồn tại' }, { status: 404 });
    }
    if (contract.status === 'Nháp') {
        return NextResponse.json({ error: 'Hợp đồng chưa sẵn sàng' }, { status: 400 });
    }
    if (['Đã ký', 'Hoàn thành', 'Hủy'].includes(contract.status)) {
        return NextResponse.json({ error: 'Hợp đồng đã được ký hoặc không thể ký' }, { status: 400 });
    }

    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';

    const now = new Date();
    const updated = await prisma.contract.update({
        where: { id },
        data: {
            status: 'Đã ký',
            signDate: now,
            signedAt: now,
            signedByName: customerName || 'Không rõ',
            signatureData: signatureData || '',
            signatureIp: ip,
            notes: notes
                ? `[KH ký: ${customerName || 'Không rõ'} — IP: ${ip}] ${notes}`
                : `[KH ký: ${customerName || 'Không rõ'} — IP: ${ip}]`,
        },
    });

    return NextResponse.json({ success: true, code: updated.code, status: updated.status });
}, { public: true });
