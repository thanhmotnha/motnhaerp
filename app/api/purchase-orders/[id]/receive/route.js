import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';

// POST /api/purchase-orders/[id]/receive
// Unified receive: handle mixed items (warehouse + project) in 1 transaction
// Body: { items: [{ id, receivedQty }], warehouseId?, receivedBy?, receivedDate?, note? }
export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const { items, warehouseId, receivedBy, receivedDate, note } = await request.json();

    if (!items?.length) return NextResponse.json({ error: 'Không có item nào' }, { status: 400 });

    const po = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: { items: true, project: { select: { id: true, name: true, code: true } } },
    });
    if (!po) return NextResponse.json({ error: 'PO không tồn tại' }, { status: 404 });

    const validItems = items.filter(it => Number(it.receivedQty) > 0);
    if (!validItems.length) return NextResponse.json({ error: 'Nhập số lượng > 0 cho ít nhất 1 sản phẩm' }, { status: 400 });

    const warehouseItems = [];
    const projectItemsByProject = {};

    for (const recv of validItems) {
        const poItem = po.items.find(i => i.id === recv.id);
        if (!poItem) continue;
        const delta = Number(recv.receivedQty);
        if (poItem.projectId) {
            if (!projectItemsByProject[poItem.projectId]) projectItemsByProject[poItem.projectId] = [];
            projectItemsByProject[poItem.projectId].push({ poItem, delta });
        } else {
            warehouseItems.push({ poItem, delta });
        }
    }

    if (warehouseItems.length > 0 && !warehouseId) {
        return NextResponse.json({ error: 'Phải chọn kho cho các sản phẩm nhập kho' }, { status: 400 });
    }

    // Validate: không cho nhận vượt số đặt
    for (const group of [warehouseItems, ...Object.values(projectItemsByProject)]) {
        for (const { poItem, delta } of group) {
            const alreadyReceived = Number(poItem.receivedQty) || 0;
            const ordered = Number(poItem.quantity) || 0;
            if (alreadyReceived + delta > ordered) {
                const remain = Math.max(0, ordered - alreadyReceived);
                return NextResponse.json({
                    error: `${poItem.productName}: vượt số đặt (đã nhận ${alreadyReceived}/${ordered} ${poItem.unit}, còn lại ${remain}). Nếu cần nhận thêm, tăng SL trên PO trước.`,
                }, { status: 400 });
            }
        }
    }

    let grnCode = null;
    if (warehouseItems.length > 0) {
        grnCode = await generateCode('goodsReceipt', 'PNK');
    }
    // Pre-compute sequential CP codes (all generateCode calls before any insert → same MAX)
    const expenseCodes = [];
    const totalExpenses = Object.values(projectItemsByProject).reduce((s, arr) => s + arr.length, 0);
    if (totalExpenses > 0) {
        const cpMaxResult = await prisma.$queryRawUnsafe(
            `SELECT COALESCE(MAX(CAST(REPLACE(code, $1, '') AS INTEGER)), 0) as max_num
             FROM "ProjectExpense"
             WHERE code LIKE $2 AND REPLACE(code, $1, '') ~ '^[0-9]+$'`,
            'CP', 'CP%'
        );
        const cpBaseMax = Number(cpMaxResult?.[0]?.max_num ?? 0);
        for (let i = 0; i < totalExpenses; i++) {
            expenseCodes.push(`CP${String(cpBaseMax + 1 + i).padStart(3, '0')}`);
        }
    }
    let expenseCodeIdx = 0;

    const productWarehouseItems = warehouseItems.filter(w => w.poItem.productId);
    let txBaseMax = 0;
    if (productWarehouseItems.length > 0) {
        const maxResult = await prisma.$queryRawUnsafe(
            `SELECT COALESCE(MAX(CAST(REPLACE(code, $1, '') AS INTEGER)), 0) as max_num
             FROM "InventoryTransaction"
             WHERE code LIKE $2 AND REPLACE(code, $1, '') ~ '^[0-9]+$'`,
            'NK', 'NK%'
        );
        txBaseMax = Number(maxResult?.[0]?.max_num ?? 0);
    }
    let txCodeIdx = 0;

    await prisma.$transaction(async (tx) => {
        if (warehouseItems.length > 0) {
            await tx.goodsReceipt.create({
                data: {
                    code: grnCode,
                    purchaseOrderId: id,
                    warehouseId,
                    receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
                    receivedBy: receivedBy || '',
                    notes: note || '',
                    createdById: session.user.id,
                    items: {
                        create: warehouseItems.map(({ poItem, delta }) => ({
                            productId: poItem.productId,
                            productName: poItem.productName,
                            unit: poItem.unit,
                            qtyOrdered: poItem.quantity,
                            qtyReceived: delta,
                            unitPrice: poItem.unitPrice,
                            variantLabel: poItem.variantLabel || '',
                            purchaseOrderItemId: poItem.id,
                        })),
                    },
                },
            });

            for (const { poItem, delta } of warehouseItems) {
                if (poItem.productId) {
                    const product = await tx.product.findUnique({
                        where: { id: poItem.productId },
                        select: { stock: true, importPrice: true },
                    });
                    const oldStock = product?.stock ?? 0;
                    const oldPrice = product?.importPrice ?? 0;
                    const avgPrice = (oldStock + delta) > 0
                        ? (oldStock * oldPrice + delta * (poItem.unitPrice || 0)) / (oldStock + delta)
                        : (poItem.unitPrice || 0);

                    await tx.product.update({
                        where: { id: poItem.productId },
                        data: {
                            stock: { increment: delta },
                            importPrice: Math.round(avgPrice),
                        },
                    });

                    const txCode = `NK${String(txBaseMax + 1 + txCodeIdx).padStart(3, '0')}`;
                    txCodeIdx++;
                    await tx.inventoryTransaction.create({
                        data: {
                            code: txCode,
                            type: 'Nhập',
                            quantity: delta,
                            unit: poItem.unit,
                            note: `Phiếu nhập ${grnCode} — PO ${po.code}`,
                            productId: poItem.productId,
                            warehouseId,
                            projectId: null,
                            date: receivedDate ? new Date(receivedDate) : new Date(),
                        },
                    });
                }

                await tx.purchaseOrderItem.update({
                    where: { id: poItem.id },
                    data: { receivedQty: { increment: delta } },
                });
            }
        }

        for (const projectId in projectItemsByProject) {
            for (const { poItem, delta } of projectItemsByProject[projectId]) {
                await tx.purchaseOrderItem.update({
                    where: { id: poItem.id },
                    data: { receivedQty: { increment: delta } },
                });

                if (poItem.materialPlanId) {
                    const plan = await tx.materialPlan.findUnique({ where: { id: poItem.materialPlanId } });
                    if (plan) {
                        const newReceivedQty = plan.receivedQty + delta;
                        const newStatus = newReceivedQty >= plan.quantity ? 'Đã nhận đủ'
                            : newReceivedQty > 0 ? 'Nhận một phần' : plan.status;
                        await tx.materialPlan.update({
                            where: { id: poItem.materialPlanId },
                            data: { receivedQty: { increment: delta }, status: newStatus },
                        });
                    }
                } else if (poItem.productId) {
                    const existing = await tx.materialPlan.findFirst({
                        where: { projectId, productId: poItem.productId, isLocked: false },
                    });
                    if (existing) {
                        await tx.materialPlan.update({
                            where: { id: existing.id },
                            data: { receivedQty: { increment: delta } },
                        });
                    } else {
                        await tx.materialPlan.create({
                            data: {
                                projectId,
                                productId: poItem.productId,
                                quantity: 0,
                                receivedQty: delta,
                                orderedQty: 0,
                                unitPrice: poItem.unitPrice || 0,
                                totalAmount: delta * (poItem.unitPrice || 0),
                                status: 'Nhận một phần',
                                type: 'Phát sinh',
                                notes: `Auto từ PO ${po.code} (ngoài dự toán)`,
                            },
                        });
                    }
                }

                if (poItem.unitPrice > 0) {
                    const expCode = expenseCodes[expenseCodeIdx++];
                    const amount = delta * poItem.unitPrice;
                    await tx.projectExpense.create({
                        data: {
                            code: expCode,
                            expenseType: 'Mua hàng',
                            description: `[GRN] ${poItem.productName} — ${po.code}`,
                            amount,
                            paidAmount: 0,
                            category: 'Vật tư',
                            status: 'Chờ thanh toán',
                            recipientType: 'supplier',
                            recipientName: po.supplier,
                            projectId,
                            notes: note || '',
                        },
                    });
                }
            }
        }

        const updatedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
        const allReceived = updatedItems.every(i => i.receivedQty >= i.quantity);
        const anyReceived = updatedItems.some(i => i.receivedQty > 0);
        const newStatus = allReceived ? 'Hoàn thành' : anyReceived ? 'Nhận một phần' : po.status;

        await tx.purchaseOrder.update({
            where: { id },
            data: {
                status: newStatus,
                receivedDate: allReceived ? new Date() : po.receivedDate,
            },
        });
    });

    const updatedPO = await prisma.purchaseOrder.findUnique({ where: { id }, include: { items: true } });

    if (updatedPO.furnitureOrderId && updatedPO.status === 'Hoàn thành') {
        await prisma.furnitureMaterialOrder.updateMany({
            where: { purchaseOrderId: id },
            data: { status: 'RECEIVED' },
        });

        const furnitureOrderId = updatedPO.furnitureOrderId;
        const allMaterialOrders = await prisma.furnitureMaterialOrder.findMany({
            where: { furnitureOrderId },
        });
        const allReceived3 = ['VAN', 'NEP', 'ACRYLIC'].every(t =>
            allMaterialOrders.find(o => o.materialType === t && o.status === 'RECEIVED')
        );
        if (allReceived3) {
            const fo = await prisma.furnitureOrder.findUnique({ where: { id: furnitureOrderId }, select: { status: true } });
            if (fo && fo.status === 'material_ordered') {
                await prisma.furnitureOrder.update({
                    where: { id: furnitureOrderId },
                    data: { status: 'cnc_ready' },
                });
            }
        }
    }

    return NextResponse.json(updatedPO);
});
