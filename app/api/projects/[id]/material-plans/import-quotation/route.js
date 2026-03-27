import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (request, { params }) => {
    const { id: projectId } = await params;

    // Find the latest quotation for this project with its items
    const quotation = await prisma.quotation.findFirst({
        where: { projectId },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
    });

    if (!quotation) {
        return NextResponse.json({ error: 'Dự án chưa có báo giá nào' }, { status: 400 });
    }

    const items = (quotation.items || []).filter(i => i.productId);
    if (items.length === 0) {
        return NextResponse.json({ error: 'Báo giá không có sản phẩm nào (items chưa link product)' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.materialPlan.findMany({
            where: { projectId },
            select: { productId: true },
        });
        const existingSet = new Set(existing.map(e => e.productId));

        const newPlans = items
            .filter(i => !existingSet.has(i.productId))
            .map(i => ({
                projectId,
                productId: i.productId,
                quantity: Number(i.volume || i.quantity) || 0,
                unitPrice: Number(i.unitPrice) || 0,
                totalAmount: (Number(i.volume || i.quantity) || 0) * (Number(i.unitPrice) || 0),
                budgetUnitPrice: Number(i.unitPrice) || 0,
                type: 'Chính',
                category: '',
                costType: 'Vật tư',
                group1: '',
                group2: '',
                supplierTag: '',
                status: 'Chưa đặt',
                notes: `Từ báo giá ${quotation.code || ''}`.trim(),
            }));

        if (newPlans.length > 0) {
            await tx.materialPlan.createMany({ data: newPlans });
        }

        return { created: newPlans.length, skipped: items.length - newPlans.length };
    });

    return NextResponse.json(result, { status: 201 });
});
