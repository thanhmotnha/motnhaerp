import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/accounting/summary — Tổng hợp thu chi
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const year = parseInt(searchParams.get('year') || new Date().getFullYear());
    
    const where = {
      date: {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31T23:59:59`),
      }
    };
    if (projectId) where.projectId = projectId;
    
    // Tổng thu/chi
    const totals = await prisma.accountEntry.groupBy({
      by: ['type'],
      where,
      _sum: { amount: true },
      _count: { id: true },
    });
    
    // Theo category
    const byCategory = await prisma.accountEntry.groupBy({
      by: ['type', 'category'],
      where,
      _sum: { amount: true },
    });
    
    // Theo tháng
    const entries = await prisma.accountEntry.findMany({
      where,
      select: { date: true, type: true, amount: true },
    });
    
    const monthly = {};
    entries.forEach(e => {
      const m = e.date.getMonth() + 1;
      if (!monthly[m]) monthly[m] = { month: m, thu: 0, chi: 0 };
      if (e.type === 'Thu') monthly[m].thu += e.amount;
      else monthly[m].chi += e.amount;
    });
    
    const totalThu = totals.find(t => t.type === 'Thu')?._sum?.amount || 0;
    const totalChi = totals.find(t => t.type === 'Chi')?._sum?.amount || 0;
    
    return NextResponse.json({
      year,
      totalThu,
      totalChi,
      profit: totalThu - totalChi,
      countThu: totals.find(t => t.type === 'Thu')?._count?.id || 0,
      countChi: totals.find(t => t.type === 'Chi')?._count?.id || 0,
      byCategory,
      monthly: Object.values(monthly).sort((a, b) => a.month - b.month),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
