import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST /api/quotations/[id]/lock — Khoá BG
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    
    const quotation = await prisma.quotation.findUnique({ where: { id } });
    if (!quotation) {
      return NextResponse.json({ error: 'Không tìm thấy báo giá' }, { status: 404 });
    }
    
    if (quotation.lockedAt) {
      return NextResponse.json({ error: 'Báo giá đã được khoá' }, { status: 400 });
    }
    
    const updated = await prisma.quotation.update({
      where: { id },
      data: { lockedAt: new Date() }
    });
    
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
