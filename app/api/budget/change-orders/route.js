import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const orders = await prisma.budgetChangeOrder.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(orders);
}, { roles: ['giam_doc', 'ke_toan'] });

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { projectId, materialPlanId, reason, oldQty, newQty, oldPrice, newPrice, requestedBy = '' } = body;
    if (!projectId || !reason?.trim()) {
        return NextResponse.json({ error: 'projectId và reason bắt buộc' }, { status: 400 });
    }

    const order = await prisma.budgetChangeOrder.create({
        data: {
            projectId,
            materialPlanId: materialPlanId || null,
            reason,
            oldQty: oldQty || 0,
            newQty: newQty || 0,
            oldPrice: oldPrice || 0,
            newPrice: newPrice || 0,
            requestedBy,
            status: 'pending',
        },
    });
    return NextResponse.json(order);
}, { roles: ['giam_doc', 'ke_toan'] });
