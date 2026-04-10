import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { acceptanceCertificateUpdateSchema } from '@/lib/validations/acceptanceCertificate';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_req, { params }) => {
    const { aid } = await params;
    const cert = await prisma.acceptanceCertificate.findUnique({
        where: { id: aid },
        include: { items: true, furnitureOrder: { select: { id: true, name: true, code: true } } },
    });
    if (!cert) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json(cert);
});

export const PUT = withAuth(async (request, { params }) => {
    const { aid } = await params;
    const body = await request.json();
    const { items, ...headerData } = acceptanceCertificateUpdateSchema.parse(body);

    const cert = await prisma.$transaction(async (tx) => {
        if (items !== undefined) {
            await tx.acceptanceCertificateItem.deleteMany({ where: { certificateId: aid } });
            await tx.acceptanceCertificateItem.createMany({
                data: items.map(item => ({ ...item, certificateId: aid })),
            });
        }
        return tx.acceptanceCertificate.update({
            where: { id: aid },
            data: headerData,
            include: { items: true },
        });
    });
    return NextResponse.json(cert);
});
