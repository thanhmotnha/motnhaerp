import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';

const TYPE_LABELS = { VAN: 'Ván sản xuất', NEP: 'Nẹp chỉ', ACRYLIC: 'Cánh Acrylic' };
const VALID_TYPES = ['VAN', 'NEP', 'ACRYLIC'];

export const POST = withAuth(async (request, { params }) => {
    const { id, type } = await params;
    if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: 'Loại không hợp lệ' }, { status: 400 });

    const body = await request.json();
    const { supplier, supplierId, deliveryDate, notes, deliveryAddress } = body;
    if (!supplier?.trim()) return NextResponse.json({ error: 'Thiếu nhà cung cấp' }, { status: 400 });

    const furnitureOrder = await prisma.furnitureOrder.findUnique({ where: { id } });
    if (!furnitureOrder) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (!['material_confirmed', 'material_ordered'].includes(furnitureOrder.status)) {
        return NextResponse.json({ error: 'Cần chốt vật liệu trước khi tạo PO' }, { status: 400 });
    }

    const materialOrder = await prisma.furnitureMaterialOrder.findUnique({
        where: { furnitureOrderId_materialType: { furnitureOrderId: id, materialType: type } },
        include: { items: true },
    });
    if (!materialOrder || materialOrder.items.length === 0) {
        return NextResponse.json({ error: 'Chưa có vật liệu trong danh sách' }, { status: 400 });
    }
    if (materialOrder.purchaseOrderId) {
        return NextResponse.json({ error: 'Đã tạo PO cho loại vật liệu này rồi' }, { status: 400 });
    }

    const poCode = await generateCode('purchaseOrder', 'PO');
    const items = materialOrder.items.map(item => ({
        productName: `[${TYPE_LABELS[type]}] ${item.name}${item.colorCode ? ` — ${item.colorCode}` : ''}`,
        unit: item.unit || 'tờ',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.quantity * item.unitPrice,
        notes: item.notes || '',
    }));
    const totalAmount = items.reduce((s, i) => s + i.amount, 0);

    const po = await prisma.purchaseOrder.create({
        data: {
            code: poCode,
            supplier,
            supplierId: supplierId || null,
            totalAmount,
            paidAmount: 0,
            status: 'Chờ duyệt',
            notes: notes || '',
            projectId: furnitureOrder.projectId || null,
            deliveryAddress: deliveryAddress || furnitureOrder.deliveryAddress || '',
            deliveryType: 'Giao về xưởng',
            orderDate: new Date(),
            deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
            furnitureOrderId: id,
            materialType: type,
            items: { create: items },
        },
        include: { items: true },
    });

    await prisma.furnitureMaterialOrder.update({
        where: { id: materialOrder.id },
        data: { purchaseOrderId: po.id, status: 'ORDERED' },
    });

    // Check if all 3 types ORDERED → update FurnitureOrder status
    const allOrders = await prisma.furnitureMaterialOrder.findMany({ where: { furnitureOrderId: id } });
    const allOrdered = VALID_TYPES.every(t => allOrders.find(o => o.materialType === t && o.status !== 'DRAFT'));
    if (allOrdered && furnitureOrder.status === 'material_confirmed') {
        await prisma.furnitureOrder.update({ where: { id }, data: { status: 'material_ordered' } });
    }

    return NextResponse.json(po, { status: 201 });
});
