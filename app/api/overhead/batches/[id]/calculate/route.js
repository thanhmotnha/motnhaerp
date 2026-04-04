import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (_request, { params }) => {
    const { id } = await params;
    const batch = await prisma.overheadBatch.findFirst({
        where: { id },
        select: { id: true, totalAmount: true, period: true, status: true },
    });
    if (!batch) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (batch.status === 'confirmed') {
        return NextResponse.json({ error: 'Đợt đã xác nhận' }, { status: 400 });
    }

    // Get active projects (not cancelled), use paidAmount as revenue base
    // No ProjectPayment model exists in schema — use project.paidAmount directly
    const projects = await prisma.project.findMany({
        where: {
            deletedAt: null,
            status: { notIn: ['Hủy'] },
        },
        select: { id: true, name: true, code: true, contractValue: true, paidAmount: true },
    });

    // Use paidAmount as revenue base; fall back to contractValue if paidAmount is 0
    const projectsWithRevenue = projects.map(p => ({
        ...p,
        revenue: p.paidAmount > 0 ? p.paidAmount : p.contractValue,
    })).filter(p => p.revenue > 0);

    const totalRevenue = projectsWithRevenue.reduce((s, p) => s + p.revenue, 0);
    if (totalRevenue === 0) {
        return NextResponse.json({ error: 'Không có dự án nào có doanh thu để phân bổ' }, { status: 400 });
    }

    const suggestions = projectsWithRevenue.map(p => ({
        projectId: p.id,
        projectName: p.name,
        projectCode: p.code,
        revenue: p.revenue,
        ratio: parseFloat(((p.revenue / totalRevenue) * 100).toFixed(4)),
        amount: parseFloat(((p.revenue / totalRevenue) * batch.totalAmount).toFixed(0)),
        isOverride: false,
        notes: '',
    }));

    return NextResponse.json({ totalAmount: batch.totalAmount, totalRevenue, suggestions });
});
