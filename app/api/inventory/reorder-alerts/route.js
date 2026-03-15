import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/inventory/reorder-alerts — Products dưới ngưỡng reorder
export async function GET() {
  try {
    const alerts = await prisma.product.findMany({
      where: {
        reorderPoint: { gt: 0 },
        stock: { lte: prisma.product.fields?.reorderPoint ?? 0 },
        deletedAt: null,
      },
      orderBy: { stock: 'asc' },
    });

    // Filter in JS vì Prisma không support column-to-column compare trực tiếp
    const products = await prisma.product.findMany({
      where: {
        reorderPoint: { gt: 0 },
        deletedAt: null,
      },
      orderBy: { stock: 'asc' },
    });

    const needReorder = products.filter(p => p.stock <= p.reorderPoint);

    return NextResponse.json(needReorder);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
