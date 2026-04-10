import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { uploadToR2 } from '@/lib/r2';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_req, { params }) => {
    const { id } = await params;
    const files = await prisma.furnitureCncFile.findMany({
        where: { furnitureOrderId: id },
        orderBy: { uploadedAt: 'asc' },
    });
    return NextResponse.json(files);
});

export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const order = await prisma.furnitureOrder.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('file');
    const pieceCount = Number(formData.get('pieceCount') || 0);
    const notes = formData.get('notes') || '';

    if (!file) return NextResponse.json({ error: 'Thiếu file' }, { status: 400 });

    const key = `cnc/${id}/${Date.now()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileUrl = await uploadToR2(buffer, key, file.type);

    const cncFile = await prisma.furnitureCncFile.create({
        data: { furnitureOrderId: id, fileName: file.name, fileUrl, pieceCount, notes },
    });

    const allFiles = await prisma.furnitureCncFile.findMany({ where: { furnitureOrderId: id } });
    const totalPieces = allFiles.reduce((s, f) => s + f.pieceCount, 0);
    await prisma.furnitureOrder.update({ where: { id }, data: { cncPieceCount: totalPieces } });

    return NextResponse.json(cncFile, { status: 201 });
});
