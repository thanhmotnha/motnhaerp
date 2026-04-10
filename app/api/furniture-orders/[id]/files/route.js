import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/furniture-orders/[id]/files
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const files = await prisma.furnitureFile.findMany({
        where: { furnitureOrderId: id },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(files);
});

// POST /api/furniture-orders/[id]/files
// Body: { fileName, fileUrl, fileType, description }
export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json();

    const order = await prisma.furnitureOrder.findUnique({ where: { id }, select: { id: true } });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });

    const file = await prisma.furnitureFile.create({
        data: {
            furnitureOrderId: id,
            fileName: body.fileName || 'file',
            fileUrl: body.fileUrl || '',
            fileType: body.fileType || 'other',
            description: body.description || '',
            uploadedBy: session.user.name || '',
        },
    });
    return NextResponse.json(file, { status: 201 });
});
