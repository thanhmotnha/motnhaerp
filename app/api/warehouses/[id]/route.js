import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// PUT /api/warehouses/[id] — Sửa kho
export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { name, address, manager, phone, status } = body;

    const existing = await prisma.warehouse.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy kho' }, { status: 404 });

    const updated = await prisma.warehouse.update({
        where: { id },
        data: {
            ...(name !== undefined && name.trim() && { name: name.trim() }),
            ...(address !== undefined && { address }),
            ...(manager !== undefined && { manager }),
            ...(phone !== undefined && { phone }),
            ...(status !== undefined && { status }),
        },
    });
    return NextResponse.json(updated);
}, { roles: ['giam_doc', 'ke_toan'] });

// DELETE /api/warehouses/[id] — Xóa kho (chỉ khi không còn SP)
export const DELETE = withAuth(async (_request, { params }) => {
    const { id } = await params;
    const count = await prisma.product.count({ where: { warehouseId: id, deletedAt: null } });
    if (count > 0) {
        return NextResponse.json({
            error: `Kho còn ${count} SP — không thể xóa. Chuyển SP sang kho khác trước.`,
        }, { status: 422 });
    }
    await prisma.warehouse.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}, { roles: ['giam_doc'] });
