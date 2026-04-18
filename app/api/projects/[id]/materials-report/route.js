import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/projects/[id]/materials-report
// Returns aggregated materials report for a project (planned, ordered, received-direct, received-from-stock, cost)
export const GET = withAuth(async (_request, { params }) => {
    const { id } = await params;

    // Projects may be referenced by id or by code (DA-001)
    const project = await prisma.project.findFirst({
        where: { OR: [{ id }, { code: id }] },
        select: { id: true, code: true, name: true },
    });
    if (!project) return NextResponse.json({ error: 'Dự án không tồn tại' }, { status: 404 });

    const projectId = project.id;

    // 1. MaterialPlan — dự toán + receivedDirect
    const plans = await prisma.materialPlan.findMany({
        where: { projectId },
        include: {
            product: { select: { id: true, code: true, name: true, unit: true, category: true } },
        },
    });

    // 2. PurchaseOrderItem — đã đặt giao thẳng dự án này
    const poItems = await prisma.purchaseOrderItem.findMany({
        where: { projectId },
        include: {
            purchaseOrder: { select: { id: true, code: true, status: true, orderDate: true } },
        },
    });

    // 3. StockIssueItem — xuất kho cho dự án này
    const stockIssueItems = await prisma.stockIssueItem.findMany({
        where: { issue: { projectId } },
        include: {
            issue: { select: { id: true, code: true, issuedDate: true } },
            product: { select: { id: true, code: true, name: true, unit: true, category: true } },
        },
    }).catch(() => []);

    // 4. ProjectExpense — chi phí (direct + allocated)
    const expensesDirect = await prisma.projectExpense.aggregate({
        where: { projectId, deletedAt: null, status: { not: 'Từ chối' } },
        _sum: { amount: true },
    });
    const expensesAllocated = await prisma.expenseAllocation.aggregate({
        where: { projectId, expense: { deletedAt: null, status: { not: 'Từ chối' } } },
        _sum: { amount: true },
    });
    const totalCost = (expensesDirect._sum.amount || 0) + (expensesAllocated._sum.amount || 0);

    // Build per-product aggregated items
    const itemsByKey = {};
    const keyOf = (productId, productName) => productId || `name:${productName}`;

    // Seed from MaterialPlan
    for (const plan of plans) {
        const key = keyOf(plan.productId, plan.product?.name || '');
        if (!itemsByKey[key]) {
            itemsByKey[key] = {
                productId: plan.productId,
                name: plan.product?.name || '',
                code: plan.product?.code || '',
                unit: plan.product?.unit || '',
                category: plan.product?.category || plan.category || 'Khác',
                planned: 0,
                ordered: 0,
                receivedDirect: 0,
                receivedFromStock: 0,
                plannedValue: 0,
                sources: new Set(),
            };
        }
        itemsByKey[key].planned += Number(plan.quantity || 0);
        itemsByKey[key].receivedDirect += Number(plan.receivedQty || 0);
        itemsByKey[key].plannedValue += Number(plan.totalAmount || 0);
    }

    // Add from PO items (ordered)
    for (const poi of poItems) {
        const key = keyOf(poi.productId, poi.productName);
        if (!itemsByKey[key]) {
            itemsByKey[key] = {
                productId: poi.productId,
                name: poi.productName,
                code: '',
                unit: poi.unit || '',
                category: 'Khác',
                planned: 0,
                ordered: 0,
                receivedDirect: 0,
                receivedFromStock: 0,
                plannedValue: 0,
                sources: new Set(),
            };
        }
        itemsByKey[key].ordered += Number(poi.quantity || 0);
        itemsByKey[key].sources.add('GT');
    }

    // Add from StockIssue
    for (const sii of stockIssueItems) {
        const pname = sii.product?.name || sii.productName || '';
        const key = keyOf(sii.productId, pname);
        if (!itemsByKey[key]) {
            itemsByKey[key] = {
                productId: sii.productId,
                name: pname,
                code: sii.product?.code || '',
                unit: sii.unit || sii.product?.unit || '',
                category: sii.product?.category || 'Khác',
                planned: 0,
                ordered: 0,
                receivedDirect: 0,
                receivedFromStock: 0,
                plannedValue: 0,
                sources: new Set(),
            };
        }
        itemsByKey[key].receivedFromStock += Number(sii.qty || 0);
        itemsByKey[key].sources.add('XK');
    }

    const items = Object.values(itemsByKey).map(it => {
        const received = it.receivedDirect + it.receivedFromStock;
        const used = received;
        const missing = it.planned - received;
        return {
            ...it,
            received,
            used,
            missing,
            sources: Array.from(it.sources),
        };
    }).sort((a, b) => a.name.localeCompare(b.name, 'vi'));

    return NextResponse.json({
        project,
        summary: {
            planned: items.reduce((s, i) => s + i.plannedValue, 0),
            ordered: poItems.reduce((s, i) => s + (Number(i.amount) || Number(i.quantity) * Number(i.unitPrice || 0)), 0),
            receivedDirectQty: items.reduce((s, i) => s + i.receivedDirect, 0),
            receivedFromStockQty: items.reduce((s, i) => s + i.receivedFromStock, 0),
            totalCost,
            itemCount: items.length,
        },
        items,
    });
});
