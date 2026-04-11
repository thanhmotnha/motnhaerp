import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const VALID_TRANSITIONS = {
    'Xác nhận':      ['Chốt & Đặt VL'],
    'Chốt & Đặt VL': ['CNC'],
    'CNC':           ['Sản xuất'],
    'Sản xuất':      ['Lắp đặt'],
    'Lắp đặt':       ['Bảo hành'],
    'Bảo hành':      [],
};

export const PATCH = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { status: newStatus } = await request.json();
    if (!newStatus) return NextResponse.json({ error: 'Thiếu status' }, { status: 400 });

    const order = await prisma.furnitureOrder.findUnique({ where: { id }, select: { status: true } });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(newStatus)) {
        return NextResponse.json(
            { error: `Không thể chuyển từ '${order.status}' sang '${newStatus}'` },
            { status: 400 }
        );
    }

    const updated = await prisma.furnitureOrder.update({
        where: { id },
        data: { status: newStatus },
    });
    return NextResponse.json(updated);
});
