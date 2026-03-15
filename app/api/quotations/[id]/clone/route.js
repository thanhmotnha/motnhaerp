import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST /api/quotations/[id]/clone — Clone BG + tạo revision mới
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    
    // Lấy BG gốc kèm categories + items
    const original = await prisma.quotation.findUnique({
      where: { id },
      include: {
        categories: true,
        items: true,
      }
    });
    
    if (!original) {
      return NextResponse.json({ error: 'Không tìm thấy báo giá' }, { status: 404 });
    }
    
    // Tính revision mới
    const maxRevision = await prisma.quotation.aggregate({
      where: {
        OR: [
          { id: original.parentId || id },
          { parentId: original.parentId || id },
        ]
      },
      _max: { revision: true }
    });
    const newRevision = (maxRevision._max.revision || 1) + 1;
    
    // Tạo code mới
    const newCode = original.code.replace(/-R\d+$/, '') + `-R${newRevision}`;
    
    // Clone BG
    const cloned = await prisma.quotation.create({
      data: {
        code: newCode,
        total: original.total,
        discount: original.discount,
        vat: original.vat,
        grandTotal: original.grandTotal,
        status: 'Nháp',
        validUntil: original.validUntil,
        notes: original.notes,
        type: original.type,
        directCost: original.directCost,
        managementFeeRate: original.managementFeeRate,
        managementFee: original.managementFee,
        designFee: original.designFee,
        otherFee: original.otherFee,
        adjustment: original.adjustment,
        adjustmentType: original.adjustmentType,
        adjustmentAmount: original.adjustmentAmount,
        deductions: original.deductions,
        revision: newRevision,
        approvalStatus: 'draft',
        parentId: original.parentId || id,
        customerId: original.customerId,
        projectId: original.projectId,
        // Clone categories
        categories: {
          create: original.categories.map(cat => ({
            name: cat.name,
            sortOrder: cat.sortOrder,
          }))
        },
      },
      include: { categories: true }
    });
    
    // Map old category IDs to new
    const catMap = {};
    original.categories.forEach((oldCat, i) => {
      catMap[oldCat.id] = cloned.categories[i]?.id;
    });
    
    // Clone items
    if (original.items.length > 0) {
      await prisma.quotationItem.createMany({
        data: original.items.map(item => ({
          name: item.name,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          sortOrder: item.sortOrder,
          coefficient: item.coefficient,
          laborCost: item.laborCost,
          materialCost: item.materialCost,
          notes: item.notes,
          productId: item.productId,
          quotationId: cloned.id,
          categoryId: item.categoryId ? (catMap[item.categoryId] || null) : null,
        }))
      });
    }
    
    // Lock BG cũ
    await prisma.quotation.update({
      where: { id },
      data: { lockedAt: new Date() }
    });
    
    const result = await prisma.quotation.findUnique({
      where: { id: cloned.id },
      include: { categories: true, items: true, customer: true }
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Clone quotation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
