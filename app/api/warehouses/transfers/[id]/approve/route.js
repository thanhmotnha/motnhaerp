import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// PATCH /api/warehouses/transfers/[id]/approve — Duyệt + thực hiện chuyển kho
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body; // "Đã chuyển" | "Huỷ"
    
    const transfer = await prisma.warehouseTransfer.findUnique({
      where: { id },
      include: { product: true }
    });
    
    if (!transfer) {
      return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });
    }
    
    if (transfer.status !== 'Chờ duyệt') {
      return NextResponse.json({ error: 'Phiếu đã được xử lý' }, { status: 400 });
    }
    
    if (status === 'Đã chuyển') {
      // Tạo 2 inventory transactions: xuất kho gốc + nhập kho đích
      const txCount = await prisma.inventoryTransaction.count();
      
      await prisma.$transaction([
        // Xuất kho gốc
        prisma.inventoryTransaction.create({
          data: {
            code: `TX-${Date.now()}-OUT`,
            type: 'Xuất chuyển kho',
            quantity: -transfer.quantity,
            productId: transfer.productId,
            warehouseId: transfer.fromWarehouseId,
            note: `Chuyển kho → ${transfer.code}`,
          }
        }),
        // Nhập kho đích
        prisma.inventoryTransaction.create({
          data: {
            code: `TX-${Date.now()}-IN`,
            type: 'Nhập chuyển kho',
            quantity: transfer.quantity,
            productId: transfer.productId,
            warehouseId: transfer.toWarehouseId,
            note: `Nhận từ chuyển kho ← ${transfer.code}`,
          }
        }),
        // Update transfer status
        prisma.warehouseTransfer.update({
          where: { id },
          data: { status: 'Đã chuyển', transferDate: new Date() }
        }),
      ]);
    } else {
      await prisma.warehouseTransfer.update({
        where: { id },
        data: { status }
      });
    }
    
    const updated = await prisma.warehouseTransfer.findUnique({
      where: { id },
      include: { fromWarehouse: true, toWarehouse: true, product: true }
    });
    
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
