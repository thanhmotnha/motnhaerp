import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { logActivity } from '@/lib/activityLog';

function generateCode() {
    const y = new Date().getFullYear();
    const m = String(new Date().getMonth() + 1).padStart(2, '0');
    return `NT-${y}${m}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

const INCLUDE_DETAIL = {
    customer: { select: { id: true, name: true, phone: true, code: true } },
    project:  { select: { id: true, code: true, name: true, phase: true, siteReadyFlag: true } },
    quotation: { select: { id: true, code: true, grandTotal: true } },
    contract:  { select: { id: true, code: true, contractValue: true, status: true } },
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

    const where = {};
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
                project:  { select: { id: true, code: true, name: true } },
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
export const POST = withAuth(async (request, _, session) => {
    const body = await request.json();
    const { name, customerId, projectId, quotationId, contractId,
            description, styleNote, roomType, deliveryAddress,
            salesperson, designer, expectedDelivery,
            items = [] } = body;

    if (!name || !customerId) {
        return NextResponse.json({ error: 'Thiếu tên đơn hàng hoặc khách hàng' }, { status: 400 });
    }

    // Generate unique code
    let code;
    let attempts = 0;
    do {
        code = generateCode();
        attempts++;
    } while (attempts < 5 && await prisma.furnitureOrder.findUnique({ where: { code } }));

    // Calculate confirmedAmount from items
    const confirmedAmount = items.reduce((s, i) => s + (i.amount || i.quantity * i.unitPrice || 0), 0);

    const order = await prisma.furnitureOrder.create({
        data: {
            code,
            name,
            customerId,
            projectId: projectId || null,
            quotationId: quotationId || null,
            contractId: contractId || null,
            description: description || '',
            styleNote: styleNote || '',
            roomType: roomType || '',
            deliveryAddress: deliveryAddress || '',
            salesperson: salesperson || '',
            designer: designer || '',
            expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
            confirmedAmount,
            createdBy: session?.user?.name || '',
            items: items.length > 0 ? {
                create: items.map((item, idx) => ({
                    sortOrder: idx,
                    quotationItemId: item.quotationItemId || null,
                    productId: item.productId || null,
                    name: item.name,
                    description: item.description || '',
                    unit: item.unit || 'bộ',
                    quantity: item.quantity || 1,
                    unitPrice: item.unitPrice || 0,
                    amount: item.amount || (item.quantity || 1) * (item.unitPrice || 0),
                    specs: item.specs || null,
                    expectedDate: item.expectedDate ? new Date(item.expectedDate) : null,
                    notes: item.notes || '',
                })),
            } : undefined,
        },
        include: INCLUDE_DETAIL,
    });

    logActivity({
        actor: session?.user?.name || '',
        action: 'CREATE',
        entityType: 'FurnitureOrder',
        entityId: order.id,
        entityLabel: `${order.code} — ${order.name}`,
    });

    return NextResponse.json(order, { status: 201 });
});
