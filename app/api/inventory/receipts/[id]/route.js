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

export const PATCH = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { items, receivedBy, notes, receivedDate } = body;

    const existing = await prisma.goodsReceipt.findUnique({
        where: { id },
        include: { items: true },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const receipt = await prisma.$transaction(async (tx) => {
        // 1. Hoàn lại tồn kho cũ
        for (const old of existing.items) {
            if (old.productId && old.qtyReceived > 0) {
                await tx.product.update({
                    where: { id: old.productId },
                    data: { stock: { decrement: old.qtyReceived } },
                });
            }
        }
        // 2. Xóa items cũ
        await tx.goodsReceiptItem.deleteMany({ where: { receiptId: id } });

        // 3. Tạo items mới + tính lại bình quân gia quyền
        for (const it of (items || [])) {
            if (!it.productId || !(it.qtyReceived > 0)) continue;
            await tx.goodsReceiptItem.create({
                data: {
                    receiptId: id,
                    productId: it.productId,
                    productName: it.productName || '',
                    unit: it.unit || '',
                    qtyOrdered: it.qtyOrdered ?? it.qtyReceived,
                    qtyReceived: Number(it.qtyReceived),
                    unitPrice: Number(it.unitPrice) || 0,
                    purchaseOrderItemId: it.purchaseOrderItemId || null,
                },
            });
            const product = await tx.product.findUnique({
                where: { id: it.productId },
                select: { stock: true, importPrice: true },
            });
            const oldStock = product?.stock ?? 0;
            const oldPrice = product?.importPrice ?? 0;
            const newQty = Number(it.qtyReceived);
            const newPrice = Number(it.unitPrice) || 0;
            const avgPrice = (oldStock + newQty) > 0
                ? (oldStock * oldPrice + newQty * newPrice) / (oldStock + newQty)
                : newPrice;
            await tx.product.update({
                where: { id: it.productId },
                data: { stock: { increment: newQty }, importPrice: Math.round(avgPrice) },
            });
        }

        // 4. Cập nhật metadata
        return tx.goodsReceipt.update({
            where: { id },
            data: {
                ...(receivedBy !== undefined && { receivedBy }),
                ...(notes !== undefined && { notes }),
                ...(receivedDate !== undefined && { receivedDate: new Date(receivedDate) }),
            },
            include: { items: true },
        });
    });

    return NextResponse.json(receipt);
}, { roles: ['giam_doc', 'ke_toan'] });

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
