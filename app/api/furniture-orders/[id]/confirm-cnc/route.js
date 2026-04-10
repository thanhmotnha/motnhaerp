import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (_req, { params }) => {
    const { id } = await params;
    const order = await prisma.furnitureOrder.findUnique({
        where: { id },
        include: { cncFiles: true },
    });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (order.cncFiles.length === 0) {
        return NextResponse.json({ error: 'Cần upload ít nhất 1 file CNC' }, { status: 400 });
    }
    if (order.status !== 'cnc_ready') {
        return NextResponse.json({ error: `Cần đặt và nhận vật liệu trước khi xác nhận CNC` }, { status: 400 });
    }

    const updated = await prisma.furnitureOrder.update({
        where: { id },
        data: { status: 'in_production', cncUploadedAt: new Date() },
    });
    return NextResponse.json(updated);
});
