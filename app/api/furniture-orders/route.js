import { withAuth, withAuthAndLog } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { withCodeRetry } from '@/lib/generateCode';
import { z } from 'zod';

const furnitureOrderCreateSchema = z.object({
    name: z.string().min(1, 'Tên đơn hàng bắt buộc'),
    customerId: z.string().min(1, 'Khách hàng bắt buộc'),
    projectId: z.string().optional().nullable(),
    quotationId: z.string().optional().nullable(),
    contractId: z.string().optional().nullable(),
    description: z.string().optional().default(''),
    styleNote: z.string().optional().default(''),
    roomType: z.string().optional().default(''),
    deliveryAddress: z.string().optional().default(''),
    salesperson: z.string().optional().default(''),
    designer: z.string().optional().default(''),
    expectedDelivery: z.string().optional().nullable(),
    items: z.array(z.object({
        quotationItemId: z.string().optional().nullable(),
        productId: z.string().optional().nullable(),
        name: z.string(),
        description: z.string().optional().default(''),
        unit: z.string().optional().default('bộ'),
        quantity: z.number().optional().default(1),
        unitPrice: z.number().optional().default(0),
        amount: z.number().optional().default(0),
        specs: z.any().optional().nullable(),
        expectedDate: z.string().optional().nullable(),
        notes: z.string().optional().default(''),
    })).optional().default([]),
});

const INCLUDE_DETAIL = {
    customer: { select: { id: true, name: true, phone: true, code: true } },
    project: { select: { id: true, code: true, name: true, phase: true, siteReadyFlag: true } },
    quotation: { select: { id: true, code: true, grandTotal: true } },
    contract: { select: { id: true, code: true, contractValue: true, status: true } },
    items: { orderBy: { sortOrder: 'asc' } },
    designs: { orderBy: { versionNumber: 'desc' } },
    materialSelections: { include: { items: true }, orderBy: { selectionRound: 'desc' } },
    batches: { include: { workshop: true, batchItems: true }, orderBy: { createdAt: 'desc' } },
    payments: { orderBy: { paidAt: 'desc' } },
};

// GET list — paginated with filters
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams, 20);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const projectId = searchParams.get('projectId') || '';

    const where = { deletedAt: null };
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;
    if (search) {
        where.OR = [
            { code: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { customer: { name: { contains: search, mode: 'insensitive' } } },
        ];
    }

    const [orders, total] = await Promise.all([
        prisma.furnitureOrder.findMany({
            where,
            include: {
                customer: { select: { id: true, name: true, phone: true } },
                project: { select: { id: true, code: true, name: true } },
                items: { select: { id: true, status: true, amount: true } },
                batches: { select: { id: true, status: true, workshopId: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.furnitureOrder.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(orders, total, { page, limit }));
});

// POST create
export const POST = withAuthAndLog(async (request, _, session) => {
    const body = await request.json();
    const validated = furnitureOrderCreateSchema.parse(body);
    const { items, ...data } = validated;

    const confirmedAmount = items.reduce((s, i) => s + (i.amount || i.quantity * i.unitPrice || 0), 0);

    const order = await withCodeRetry('furnitureOrder', 'NT', async (code) =>
        prisma.furnitureOrder.create({
            data: {
                code,
                name: data.name,
                customerId: data.customerId,
                projectId: data.projectId || null,
                quotationId: data.quotationId || null,
                contractId: data.contractId || null,
                description: data.description,
                styleNote: data.styleNote,
                roomType: data.roomType,
                deliveryAddress: data.deliveryAddress,
                salesperson: data.salesperson,
                designer: data.designer,
                expectedDelivery: data.expectedDelivery ? new Date(data.expectedDelivery) : null,
                confirmedAmount,
                createdBy: session?.user?.name || '',
                items: items.length > 0 ? {
                    create: items.map((item, idx) => ({
                        sortOrder: idx,
                        quotationItemId: item.quotationItemId || null,
                        productId: item.productId || null,
                        name: item.name,
                        description: item.description,
                        unit: item.unit,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        amount: item.amount || item.quantity * item.unitPrice,
                        specs: item.specs || null,
                        expectedDate: item.expectedDate ? new Date(item.expectedDate) : null,
                        notes: item.notes,
                    })),
                } : undefined,
            },
            include: INCLUDE_DETAIL,
        })
    );

    return NextResponse.json(order, { status: 201 });
}, { entityType: 'FurnitureOrder' });

