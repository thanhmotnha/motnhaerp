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
      // Pre-compute next sequential codes for XK (xuất) and NK (nhập)
      const xkMaxResult = await prisma.$queryRawUnsafe(
        `SELECT COALESCE(MAX(CAST(REPLACE(code, $1, '') AS INTEGER)), 0) as max_num
         FROM "InventoryTransaction"
         WHERE code LIKE $2 AND REPLACE(code, $1, '') ~ '^[0-9]+$'`,
        'XK', 'XK%'
      );
      const nkMaxResult = await prisma.$queryRawUnsafe(
        `SELECT COALESCE(MAX(CAST(REPLACE(code, $1, '') AS INTEGER)), 0) as max_num
         FROM "InventoryTransaction"
         WHERE code LIKE $2 AND REPLACE(code, $1, '') ~ '^[0-9]+$'`,
        'NK', 'NK%'
      );
      const xkBaseMax = Number(xkMaxResult?.[0]?.max_num ?? 0);
      const nkBaseMax = Number(nkMaxResult?.[0]?.max_num ?? 0);

      const xkCode = `XK${String(xkBaseMax + 1).padStart(3, '0')}`;
      const nkCode = `NK${String(nkBaseMax + 1).padStart(3, '0')}`;

      await prisma.$transaction(async (tx) => {
        // Xuất kho gốc
        await tx.inventoryTransaction.create({
          data: {
            code: xkCode,
            type: 'Xuất chuyển kho',
            quantity: -transfer.quantity,
            productId: transfer.productId,
            warehouseId: transfer.fromWarehouseId,
            note: `Chuyển kho → ${transfer.code}`,
          }
        });

        // Nhập kho đích
        await tx.inventoryTransaction.create({
          data: {
            code: nkCode,
            type: 'Nhập chuyển kho',
            quantity: transfer.quantity,
            productId: transfer.productId,
            warehouseId: transfer.toWarehouseId,
            note: `Nhận từ chuyển kho ← ${transfer.code}`,
          }
        });

        // Product.stock does not change overall (xuất 1 kho + nhập 1 kho = 0)
        // Không cần update Product.stock vì tổng tồn kho không đổi khi chuyển giữa kho.

        // Update transfer status
        await tx.warehouseTransfer.update({
          where: { id },
          data: { status: 'Đã chuyển', transferDate: new Date() }
        });
      });
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
