import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async () => {
    const [customers, quotations, contracts] = await Promise.all([
        prisma.customer.count({ where: { deletedAt: null } }),
        prisma.quotation.groupBy({ by: ['status'], _count: true, where: { deletedAt: null } }),
        prisma.contract.count({ where: { deletedAt: null, status: { not: 'Nháp' } } }),
    ]);

    const qByStatus = Object.fromEntries(quotations.map(q => [q.status, q._count]));
    const totalBG = quotations.reduce((s, q) => s + q._count, 0);
    const confirmed = (qByStatus['Xác nhận'] || 0) + (qByStatus['Hợp đồng'] || 0);
    const signed = qByStatus['Hợp đồng'] || 0;

    return NextResponse.json({
        stages: [
            { label: 'Khách hàng', count: customers, color: 'var(--accent-primary)' },
            { label: 'Báo giá', count: totalBG, color: 'var(--status-info)', rate: customers > 0 ? Math.round(totalBG / customers * 100) : 0 },
            { label: 'Xác nhận BG', count: confirmed, color: 'var(--status-warning)', rate: totalBG > 0 ? Math.round(confirmed / totalBG * 100) : 0 },
            { label: 'Ký HĐ', count: signed, color: 'var(--status-success)', rate: confirmed > 0 ? Math.round(signed / confirmed * 100) : 0 },
        ],
        details: qByStatus,
    });
}, { roles: ['giam_doc', 'ke_toan'] });
