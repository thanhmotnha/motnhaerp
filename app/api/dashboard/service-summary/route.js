import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/service-summary
 *
 * Tổng quan công nợ DỊCH VỤ (SupplierDebt + ContractorDebt có allocationPlan != null).
 *
 * Response:
 * {
 *   pending: { total: <remaining tổng>, count: <số debt chưa trả hết> },
 *   paid:    { total: <tổng đã trả all-time>, count: <số debt đã trả hết> },
 *   topUnpaidBySupplier: [ { recipientName, recipientType, remaining, debtCount } ... top 5 ],
 *   byCategory:          [ { category, totalPending, count } ... ],
 * }
 */
export const GET = withAuth(async () => {
    const [supplierDebts, contractorDebts] = await Promise.all([
        prisma.supplierDebt.findMany({
            where: {
                allocationPlan: { not: null },
                status: { in: ['open', 'partial', 'paid'] },
            },
            select: {
                id: true,
                status: true,
                totalAmount: true,
                paidAmount: true,
                serviceCategory: true,
                supplier: { select: { id: true, name: true } },
            },
        }),
        prisma.contractorDebt.findMany({
            where: {
                allocationPlan: { not: null },
                status: { in: ['open', 'partial', 'paid'] },
            },
            select: {
                id: true,
                status: true,
                totalAmount: true,
                paidAmount: true,
                serviceCategory: true,
                contractor: { select: { id: true, name: true } },
            },
        }),
    ]);

    // Normalize vào một cấu trúc chung
    const rows = [
        ...supplierDebts.map(d => ({
            id: d.id,
            status: d.status,
            totalAmount: Number(d.totalAmount || 0),
            paidAmount: Number(d.paidAmount || 0),
            category: d.serviceCategory || '(Chưa phân loại)',
            recipientId: d.supplier?.id || '',
            recipientName: d.supplier?.name || '(Không rõ)',
            recipientType: 'NCC',
        })),
        ...contractorDebts.map(d => ({
            id: d.id,
            status: d.status,
            totalAmount: Number(d.totalAmount || 0),
            paidAmount: Number(d.paidAmount || 0),
            category: d.serviceCategory || '(Chưa phân loại)',
            recipientId: d.contractor?.id || '',
            recipientName: d.contractor?.name || '(Không rõ)',
            recipientType: 'Thầu phụ',
        })),
    ];

    // --- pending & paid tổng ---
    let pendingTotal = 0;
    let pendingCount = 0;
    let paidTotal = 0;
    let paidCount = 0;

    for (const r of rows) {
        const remaining = Math.max(0, r.totalAmount - r.paidAmount);
        paidTotal += r.paidAmount; // cộng all-time đã trả
        if (r.status === 'paid') {
            paidCount += 1;
        } else {
            pendingTotal += remaining;
            pendingCount += 1;
        }
    }

    // --- top 5 theo recipient (chỉ tính debt còn nợ) ---
    const byRecipient = new Map();
    for (const r of rows) {
        if (r.status === 'paid') continue;
        const key = `${r.recipientType}::${r.recipientName}`;
        const remaining = Math.max(0, r.totalAmount - r.paidAmount);
        if (remaining <= 0) continue;
        const cur = byRecipient.get(key) || {
            recipientName: r.recipientName,
            recipientType: r.recipientType,
            remaining: 0,
            debtCount: 0,
        };
        cur.remaining += remaining;
        cur.debtCount += 1;
        byRecipient.set(key, cur);
    }
    const topUnpaidBySupplier = [...byRecipient.values()]
        .sort((a, b) => b.remaining - a.remaining)
        .slice(0, 5);

    // --- group theo category (chỉ tính debt còn nợ) ---
    const byCategoryMap = new Map();
    for (const r of rows) {
        if (r.status === 'paid') continue;
        const remaining = Math.max(0, r.totalAmount - r.paidAmount);
        if (remaining <= 0) continue;
        const cur = byCategoryMap.get(r.category) || {
            category: r.category,
            totalPending: 0,
            count: 0,
        };
        cur.totalPending += remaining;
        cur.count += 1;
        byCategoryMap.set(r.category, cur);
    }
    const byCategory = [...byCategoryMap.values()].sort(
        (a, b) => b.totalPending - a.totalPending
    );

    return NextResponse.json({
        pending: { total: pendingTotal, count: pendingCount },
        paid: { total: paidTotal, count: paidCount },
        topUnpaidBySupplier,
        byCategory,
    });
}, { roles: ['giam_doc', 'ke_toan'] });
