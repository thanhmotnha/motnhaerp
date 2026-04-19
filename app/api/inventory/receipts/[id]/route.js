import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
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

// Helper: recalculate PO status from all its items' receivedQty
async function recalcPoStatus(tx, purchaseOrderId) {
    const items = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId } });
    if (items.length === 0) return;
    const allReceived = items.every(i => i.receivedQty >= i.quantity);
    const anyReceived = items.some(i => i.receivedQty > 0);
    const newStatus = allReceived ? 'Hoàn thành' : anyReceived ? 'Nhận một phần' : 'Chờ nhận';
    await tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: newStatus, receivedDate: allReceived ? new Date() : null },
    });
}

export const PATCH = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { items, receivedBy, notes, receivedDate } = body;

    const existing = await prisma.goodsReceipt.findUnique({
        where: { id },
        include: { items: true },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Validate: items mới phải có warehouseId khớp phiếu (trừ SP chưa gán kho)
    const newProductIds = (items || []).filter(it => it.productId).map(it => it.productId);
    if (newProductIds.length > 0) {
        const prods = await prisma.product.findMany({
            where: { id: { in: newProductIds } },
            select: { id: true, name: true, warehouseId: true },
        });
        for (const p of prods) {
            if (p.warehouseId && p.warehouseId !== existing.warehouseId) {
                return NextResponse.json({
                    error: `${p.name}: thuộc kho khác với phiếu — không thể thêm vào phiếu này`,
                }, { status: 400 });
            }
        }
    }

    const receipt = await prisma.$transaction(async (tx) => {
        // 1. Reversal: hoàn lại tồn kho + receivedQty trên PO items + xóa InventoryTransactions cũ
        for (const old of existing.items) {
            if (old.productId && old.qtyReceived > 0) {
                await tx.product.update({
                    where: { id: old.productId },
                    data: { stock: { decrement: old.qtyReceived } },
                });
            }
            if (old.purchaseOrderItemId && old.qtyReceived > 0) {
                await tx.purchaseOrderItem.update({
                    where: { id: old.purchaseOrderItemId },
                    data: { receivedQty: { decrement: old.qtyReceived } },
                });
            }
        }
        await tx.inventoryTransaction.deleteMany({
            where: { note: { contains: `Phiếu nhập ${existing.code}` } },
        });

        // 2. Xóa items cũ
        await tx.goodsReceiptItem.deleteMany({ where: { receiptId: id } });

        // 3. Tạo items mới + tính lại bình quân gia quyền + tạo InventoryTransaction + cập nhật PO receivedQty
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

            const txCode = await generateCode('inventoryTransaction', 'NK');
            await tx.inventoryTransaction.create({
                data: {
                    code: txCode,
                    type: 'Nhập',
                    quantity: newQty,
                    unit: it.unit || '',
                    note: `Phiếu nhập ${existing.code}`,
                    productId: it.productId,
                    warehouseId: existing.warehouseId,
                    date: receivedDate ? new Date(receivedDate) : existing.receivedDate,
                },
            });

            if (it.purchaseOrderItemId) {
                await tx.purchaseOrderItem.update({
                    where: { id: it.purchaseOrderItemId },
                    data: { receivedQty: { increment: newQty } },
                });
            }
        }

        // 4. Recalc PO status
        if (existing.purchaseOrderId) {
            await recalcPoStatus(tx, existing.purchaseOrderId);
        }

        // 5. Cập nhật metadata
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
        // Reversal: hoàn tồn kho + receivedQty PO items + xóa InventoryTransactions
        for (const item of receipt.items) {
            if (item.productId && item.qtyReceived > 0) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.qtyReceived } },
                });
            }
            if (item.purchaseOrderItemId && item.qtyReceived > 0) {
                await tx.purchaseOrderItem.update({
                    where: { id: item.purchaseOrderItemId },
                    data: { receivedQty: { decrement: item.qtyReceived } },
                });
            }
        }
        await tx.inventoryTransaction.deleteMany({
            where: { note: { contains: `Phiếu nhập ${receipt.code}` } },
        });

        // Recalc PO status
        if (receipt.purchaseOrderId) {
            await recalcPoStatus(tx, receipt.purchaseOrderId);
        }

        await tx.goodsReceipt.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
}, { roles: ['giam_doc', 'ke_toan'] });
