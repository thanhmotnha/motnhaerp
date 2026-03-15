import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/warehouses/transfers — List transfers
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    const where = {};
    if (status) where.status = status;
    
    const transfers = await prisma.warehouseTransfer.findMany({
      where,
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        product: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json(transfers);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/warehouses/transfers — Tạo phiếu chuyển kho
export async function POST(request) {
  try {
    const body = await request.json();
    const { fromWarehouseId, toWarehouseId, productId, quantity, notes, createdBy } = body;
    
    if (!fromWarehouseId || !toWarehouseId || !productId || !quantity) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }
    
    if (fromWarehouseId === toWarehouseId) {
      return NextResponse.json({ error: 'Không thể chuyển trong cùng kho' }, { status: 400 });
    }
    
    // Gen code
    const count = await prisma.warehouseTransfer.count();
    const code = `CK-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    
    const transfer = await prisma.warehouseTransfer.create({
      data: {
        code,
        fromWarehouseId,
        toWarehouseId,
        productId,
        quantity: parseFloat(quantity),
        notes: notes || '',
        createdBy: createdBy || '',
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        product: true,
      }
    });
    
    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
