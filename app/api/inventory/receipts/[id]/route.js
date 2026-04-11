import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const receipt = await prisma.goodsReceipt.findUnique({
        where: { id },
        include: {
            purchaseOrder: { select: { code: true, supplier: true, supplierRel: { select: { name: true, phone: true } } } },
            warehouse: { select: { name: true, address: true } },
            items: { include: { product: { select: { code: true } } } },
        },
    });
    if (!receipt) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(receipt);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const receipt = await prisma.goodsReceipt.findUnique({
        where: { id },
        include: { items: true },
    });
    if (!receipt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
        // Hoàn lại tồn kho (đảo ngược việc nhập)
        for (const item of receipt.items) {
            if (item.productId && item.qtyReceived > 0) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.qtyReceived } },
                });
            }
        }
        await tx.goodsReceipt.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
}, { roles: ['giam_doc', 'ke_toan'] });
