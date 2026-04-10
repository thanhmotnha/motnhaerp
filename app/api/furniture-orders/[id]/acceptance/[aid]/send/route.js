import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export const POST = withAuth(async (_req, { params }) => {
    const { aid } = await params;
    const cert = await prisma.acceptanceCertificate.findUnique({
        where: { id: aid },
        include: { items: true },
    });
    if (!cert) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (!cert.items?.length) return NextResponse.json({ error: 'Biên bản chưa có hạng mục' }, { status: 400 });
    if (cert.status === 'SIGNED') return NextResponse.json({ error: 'Biên bản đã được ký, không thể gửi lại' }, { status: 400 });

    const token = cert.publicToken || randomUUID();
    const updated = await prisma.acceptanceCertificate.update({
        where: { id: aid },
        data: { publicToken: token, status: 'SENT' },
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'https://erp.motnha.vn';
    return NextResponse.json({ ...updated, publicUrl: `${baseUrl}/public/acceptance/${token}` });
});
