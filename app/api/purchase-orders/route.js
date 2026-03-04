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
    const warnings = [];
    let needsApproval = false;

    // ====== BUDGET GUARDRAILS ======
    if (items && poData.projectId) {
        for (const item of items) {
            if (!item.materialPlanId) continue;
            const plan = await prisma.materialPlan.findUnique({ where: { id: item.materialPlanId } });
            if (!plan || !plan.isLocked) continue;

            // Price check
            if (plan.budgetUnitPrice > 0 && item.unitPrice > plan.budgetUnitPrice) {
                const diff = ((item.unitPrice - plan.budgetUnitPrice) / plan.budgetUnitPrice * 100).toFixed(1);
                warnings.push(`${item.productName}: ĐG ${item.unitPrice.toLocaleString()} > DT ${plan.budgetUnitPrice.toLocaleString()} (+${diff}%)`);
                needsApproval = true;
            }

            // Quantity check
            const maxAllowed = plan.quantity * (1 + plan.wastePercent / 100);
            const totalOrdered = plan.orderedQty + item.quantity;
            if (totalOrdered > maxAllowed) {
                return NextResponse.json({
                    error: `${item.productName}: Tổng đặt (${totalOrdered}) vượt giới hạn (${maxAllowed}). Cần tạo phiếu điều chỉnh.`,
                    type: 'QUANTITY_EXCEEDED',
                }, { status: 422 });
            }
        }
    }

    const code = await generateCode('purchaseOrder', 'PO');
    const status = needsApproval ? 'Chờ duyệt vượt định mức' : (poData.status || 'Chờ duyệt');
    const order = await prisma.purchaseOrder.create({
        data: {
            code,
            supplier: poData.supplier,
            totalAmount: poData.totalAmount,
            paidAmount: poData.paidAmount,
            status,
            notes: poData.notes,
            projectId: poData.projectId || null,
            orderDate: poData.orderDate || new Date(),
            deliveryDate: poData.deliveryDate || null,
            receivedDate: poData.receivedDate || null,
            items: items ? { create: items } : undefined,
        },
        include: { items: true, project: { select: { name: true, code: true } } },
    });
    return NextResponse.json({ ...order, warnings, needsApproval });
});
