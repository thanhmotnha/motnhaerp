import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');
    const projectId = searchParams.get('projectId');
    const search = searchParams.get('search');

    const where = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (projectId) where.projectId = projectId;
    if (search) where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
    ];

    const [data, total] = await Promise.all([
        prisma.furnitureOrder.findMany({
            where, skip, take: limit,
            include: {
                customer: { select: { id: true, name: true, phone: true } },
                project: { select: { id: true, code: true, name: true } },
                _count: { select: { items: true, designs: true, batches: true, payments: true } },
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.furnitureOrder.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(data, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    if (!body.customerId || !body.name) {
        return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }
    const code = await generateCode('furnitureOrder', 'NT');
    const { items = [], ...headerData } = body;

    const order = await prisma.furnitureOrder.create({
        data: {
            code,
            name: headerData.name,
            customerId: headerData.customerId,
            projectId: headerData.projectId || null,
            quotationId: headerData.quotationId || null,
            contractId: headerData.contractId || null,
            description: headerData.description || '',
            styleNote: headerData.styleNote || '',
            roomType: headerData.roomType || '',
            deliveryAddress: headerData.deliveryAddress || '',
            internalNote: headerData.internalNote || '',
            salesperson: headerData.salesperson || '',
            designer: headerData.designer || '',
            expectedDelivery: headerData.expectedDelivery ? new Date(headerData.expectedDelivery) : null,
            createdBy: request.user?.name || '',
            items: items.length > 0 ? {
                create: items.map((it, idx) => ({
                    sortOrder: idx,
                    name: it.name,
                    description: it.description || '',
                    unit: it.unit || 'bộ',
                    quantity: it.quantity || 1,
                    unitPrice: it.unitPrice || 0,
                    amount: (it.quantity || 1) * (it.unitPrice || 0),
                    specs: it.specs || null,
                    productId: it.productId || null,
                    quotationItemId: it.quotationItemId || null,
                    notes: it.notes || '',
                })),
            } : undefined,
        },
        include: { items: true, customer: { select: { id: true, name: true } } },
    });
    return NextResponse.json(order, { status: 201 });
});
