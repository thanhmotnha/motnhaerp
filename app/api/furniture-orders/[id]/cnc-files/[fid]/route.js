import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const DELETE = withAuth(async (_req, { params }) => {
    const { id, fid } = await params;
    const file = await prisma.furnitureCncFile.findFirst({
        where: { id: fid, furnitureOrderId: id },
    });
    if (!file) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    await prisma.furnitureCncFile.delete({ where: { id: fid } });

    const allFiles = await prisma.furnitureCncFile.findMany({ where: { furnitureOrderId: id } });
    const totalPieces = allFiles.reduce((s, f) => s + f.pieceCount, 0);
    await prisma.furnitureOrder.update({ where: { id }, data: { cncPieceCount: totalPieces } });

    return NextResponse.json({ success: true });
});
