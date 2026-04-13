import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const po = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: { items: true, project: { select: { name: true, code: true, address: true } } },
    });
    if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(po);
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { status, paidAmount, deliveryType, deliveryAddress, notes, deliveryDate, supplier, items } = body;

    // If items provided, replace all items atomically and recalculate totalAmount
    if (items !== undefined) {
        const po = await prisma.$transaction(async (tx) => {
            await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
            const created = items.length > 0
                ? await tx.purchaseOrderItem.createMany({
                    data: items.map(it => ({
                        purchaseOrderId: id,
                        productName: it.productName || '',
                        unit: it.unit || '',
                        quantity: Number(it.quantity) || 0,
                        unitPrice: Number(it.unitPrice) || 0,
                        amount: (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
                        productId: it.productId || null,
                        budgetItemId: it.budgetItemId || null,
                        variantLabel: it.variantLabel || '',
                    })),
                })
                : { count: 0 };

            const totalAmount = items.reduce((s, it) =>
                s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);

            return tx.purchaseOrder.update({
                where: { id },
                data: {
                    totalAmount,
                    ...(supplier !== undefined && { supplier }),
                    ...(notes !== undefined && { notes }),
                    ...(deliveryDate !== undefined && { deliveryDate: deliveryDate ? new Date(deliveryDate) : null }),
                },
                include: { items: true },
            });
        });
        return NextResponse.json(po);
    }

    const po = await prisma.purchaseOrder.update({
        where: { id },
        data: {
            ...(status !== undefined && { status }),
            ...(paidAmount !== undefined && { paidAmount: Number(paidAmount) }),
            ...(supplier !== undefined && { supplier }),
            ...(deliveryType !== undefined && { deliveryType }),
            ...(deliveryAddress !== undefined && { deliveryAddress }),
            ...(notes !== undefined && { notes }),
            ...(deliveryDate !== undefined && { deliveryDate: deliveryDate ? new Date(deliveryDate) : null }),
        },
        include: { items: true },
    });
    return NextResponse.json(po);
}, { roles: ['giam_doc', 'ke_toan', 'kho', 'ky_thuat'] });
