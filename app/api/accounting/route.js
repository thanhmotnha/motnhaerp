import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/accounting — List thu chi
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const projectId = searchParams.get('projectId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    
    const where = {};
    if (type) where.type = type;
    if (category) where.category = category;
    if (projectId) where.projectId = projectId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    
    const entries = await prisma.accountEntry.findMany({
      where,
      include: { project: { select: { id: true, name: true, code: true } } },
      orderBy: { date: 'desc' },
    });
    
    return NextResponse.json(entries);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/accounting — Tạo bút toán
export async function POST(request) {
  try {
    const body = await request.json();
    const { type, category, amount, description, projectId, reference, date, createdBy } = body;
    
    if (!type || !amount) {
      return NextResponse.json({ error: 'Thiếu loại hoặc số tiền' }, { status: 400 });
    }
    
    const count = await prisma.accountEntry.count();
    const prefix = type === 'Thu' ? 'PT' : 'PC';
    const code = `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    
    const entry = await prisma.accountEntry.create({
      data: {
        code,
        date: date ? new Date(date) : new Date(),
        type,
        category: category || 'Khác',
        amount: parseFloat(amount),
        description: description || '',
        projectId: projectId || null,
        reference: reference || '',
        createdBy: createdBy || '',
      },
      include: { project: { select: { id: true, name: true, code: true } } },
    });
    
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
