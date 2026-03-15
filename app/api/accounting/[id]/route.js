import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/accounting/[id] — Chi tiết entry
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const entry = await prisma.accountEntry.findUnique({
      where: { id },
      include: { project: { select: { id: true, name: true, code: true } } },
    });
    if (!entry) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json(entry);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/accounting/[id] — Cập nhật
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const entry = await prisma.accountEntry.update({
      where: { id },
      data: {
        ...body,
        amount: body.amount ? parseFloat(body.amount) : undefined,
        date: body.date ? new Date(body.date) : undefined,
      },
      include: { project: { select: { id: true, name: true, code: true } } },
    });
    
    return NextResponse.json(entry);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/accounting/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.accountEntry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
