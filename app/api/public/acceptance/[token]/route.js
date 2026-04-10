import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = async (_req, { params }) => {
    const { token } = await params;
    const cert = await prisma.acceptanceCertificate.findUnique({
        where: { publicToken: token },
        include: {
            items: true,
            furnitureOrder: { select: { id: true, name: true, code: true, deliveryAddress: true } },
        },
    });
    if (!cert) return NextResponse.json({ error: 'Link không hợp lệ hoặc đã hết hạn' }, { status: 404 });
    return NextResponse.json(cert);
};

export const POST = async (request, { params }) => {
    const { token } = await params;
    const cert = await prisma.acceptanceCertificate.findUnique({ where: { publicToken: token } });
    if (!cert) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (cert.status === 'SIGNED') return NextResponse.json({ error: 'Đã ký rồi' }, { status: 400 });

    const body = await request.json();
    const { customerName, customerSignatureUrl } = body;
    if (!customerSignatureUrl) return NextResponse.json({ error: 'Thiếu chữ ký' }, { status: 400 });

    const updated = await prisma.acceptanceCertificate.update({
        where: { id: cert.id },
        data: {
            status: 'SIGNED',
            customerName: customerName || cert.customerName,
            customerSignatureUrl,
            signedAt: new Date(),
        },
        include: { items: true },
    });
    return NextResponse.json(updated);
};
