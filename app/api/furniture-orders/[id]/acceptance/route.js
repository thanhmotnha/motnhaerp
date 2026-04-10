import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { acceptanceCertificateCreateSchema } from '@/lib/validations/acceptanceCertificate';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_req, { params }) => {
    const { id } = await params;
    const certificates = await prisma.acceptanceCertificate.findMany({
        where: { furnitureOrderId: id },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(certificates);
});

export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const order = await prisma.furnitureOrder.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    const body = await request.json();
    const { items, quotationId, customerName } = acceptanceCertificateCreateSchema.parse(body);

    const code = await generateCode('acceptanceCertificate', 'BB');
    const cert = await prisma.acceptanceCertificate.create({
        data: {
            code,
            furnitureOrderId: id,
            quotationId: quotationId || null,
            customerName: customerName || order.name || '',
            items: { create: items },
        },
        include: { items: true },
    });
    return NextResponse.json(cert, { status: 201 });
});
