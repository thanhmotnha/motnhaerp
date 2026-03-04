import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { purchaseOrderCreateSchema } from '@/lib/validations/purchaseOrder';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const search = searchParams.get('search') || '';

    const where = {};
    if (search) {
        where.OR = [
            { code: { contains: search, mode: 'insensitive' } },
            { supplier: { contains: search, mode: 'insensitive' } },
            { project: { name: { contains: search, mode: 'insensitive' } } },
        ];
    }

    const [orders, total] = await Promise.all([
        prisma.purchaseOrder.findMany({
            where,
            include: {
                items: true,
                project: { select: { name: true, code: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.purchaseOrder.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(orders, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { items, ...poData } = purchaseOrderCreateSchema.parse(body);
    const code = await generateCode('purchaseOrder', 'PO');
    const order = await prisma.purchaseOrder.create({
        data: {
            code,
            supplier: poData.supplier,
            totalAmount: poData.totalAmount,
            paidAmount: poData.paidAmount,
            status: poData.status,
            notes: poData.notes,
            projectId: poData.projectId || null,
            orderDate: poData.orderDate || new Date(),
            deliveryDate: poData.deliveryDate || null,
            receivedDate: poData.receivedDate || null,
            items: items ? { create: items } : undefined,
        },
        include: { items: true, project: { select: { name: true, code: true } } },
    });
    return NextResponse.json(order);
});
