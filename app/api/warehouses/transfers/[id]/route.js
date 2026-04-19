import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// DELETE /api/warehouses/transfers/[id] — chỉ xóa được phiếu "Chờ duyệt"
export const DELETE = withAuth(async (_request, { params }) => {
    const { id } = await params;
    const existing = await prisma.warehouseTransfer.findUnique({ where: { id }, select: { status: true } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });
    if (existing.status !== 'Chờ duyệt') {
        return NextResponse.json({ error: 'Chỉ xóa được phiếu Chờ duyệt' }, { status: 422 });
    }
    await prisma.warehouseTransfer.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}, { roles: ['giam_doc', 'ke_toan', 'kho'] });
