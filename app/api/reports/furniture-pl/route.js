import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET furniture P&L by month
// ?year=2026&months=6
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear());
    const months = parseInt(searchParams.get('months') || 6);

    const from = new Date(year, 0, 1);
    const to = new Date(year, 11, 31, 23, 59, 59);

    // Orders by month
    const orders = await prisma.furnitureOrder.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: {
            id: true, code: true, status: true,
            confirmedAmount: true, cancelledAmount: true,
            paidAmount: true, depositAmount: true,
            createdAt: true, deliveredAt: true,
        },
    });

    // Payments by month
    const payments = await prisma.furniturePayment.findMany({
        where: { paidAt: { gte: from, lte: to }, type: { not: 'refund' } },
        select: { amount: true, type: true, paidAt: true },
    });

    // Aggregate by month
    const monthlyData = [];
    for (let m = 0; m < 12; m++) {
        const label = `${String(m + 1).padStart(2, '0')}/${year}`;
        const mOrders = orders.filter(o => new Date(o.createdAt).getMonth() === m);
        const mPayments = payments.filter(p => new Date(p.paidAt).getMonth() === m);
        const mCompleted = orders.filter(o => o.status === 'completed' && o.deliveredAt && new Date(o.deliveredAt).getMonth() === m);

        monthlyData.push({
            month: label,
            newOrders: mOrders.length,
            orderValue: mOrders.reduce((s, o) => s + (o.confirmedAmount || 0), 0),
            completedOrders: mCompleted.length,
            completedValue: mCompleted.reduce((s, o) => s + (o.confirmedAmount || 0), 0),
            collected: mPayments.reduce((s, p) => s + (p.amount || 0), 0),
            cancelledValue: mOrders.reduce((s, o) => s + (o.cancelledAmount || 0), 0),
        });
    }

    // Status summary
    const statusSummary = {};
    for (const o of orders) {
        statusSummary[o.status] = (statusSummary[o.status] || 0) + 1;
    }

    // Total outstanding
    const allActive = await prisma.furnitureOrder.findMany({
        where: { status: { notIn: ['cancelled', 'completed'] } },
        select: { confirmedAmount: true, paidAmount: true },
    });
    const totalOutstanding = allActive.reduce((s, o) => s + (o.confirmedAmount - o.paidAmount), 0);

    return NextResponse.json({
        year,
        monthly: monthlyData,
        statusSummary,
        totalOutstanding,
        totalOrders: orders.length,
        totalValue: orders.reduce((s, o) => s + (o.confirmedAmount || 0), 0),
        totalCollected: payments.reduce((s, p) => s + (p.amount || 0), 0),
    });
}, { roles: ['giam_doc', 'pho_gd', 'ke_toan'] });
