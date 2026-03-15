import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const status = searchParams.get('status');
    const workshopId = searchParams.get('workshopId');
    const furnitureOrderId = searchParams.get('furnitureOrderId');

    const where = {};
    if (status) where.status = status;
    if (workshopId) where.workshopId = workshopId;
    if (furnitureOrderId) where.furnitureOrderId = furnitureOrderId;

    const [data, total] = await Promise.all([
        prisma.productionBatch.findMany({
            where, skip, take: limit,
            include: {
                workshop: { select: { id: true, code: true, name: true } },
                furnitureOrder: { select: { id: true, code: true, name: true } },
                _count: { select: { batchItems: true } },
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.productionBatch.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(data, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    if (!body.workshopId || !body.furnitureOrderId) {
        return NextResponse.json({ error: 'Thiếu workshopId hoặc furnitureOrderId' }, { status: 400 });
    }
    const code = await generateCode('productionBatch', 'SX');
    const { batchItems = [], ...headerData } = body;

    const batch = await prisma.productionBatch.create({
        data: {
            code,
            workshopId: headerData.workshopId,
            furnitureOrderId: headerData.furnitureOrderId,
            note: headerData.note || '',
            expectedStart: headerData.expectedStart ? new Date(headerData.expectedStart) : null,
            expectedEnd: headerData.expectedEnd ? new Date(headerData.expectedEnd) : null,
            createdBy: request.user?.name || '',
            batchItems: batchItems.length > 0 ? {
                create: batchItems.map(it => ({
                    furnitureOrderItemId: it.furnitureOrderItemId || null,
                    productName: it.productName || '',
                    quantity: it.quantity || 0,
                    note: it.note || '',
                })),
            } : undefined,
        },
        include: { batchItems: true, workshop: { select: { id: true, name: true } } },
    });
    return NextResponse.json(batch, { status: 201 });
});
