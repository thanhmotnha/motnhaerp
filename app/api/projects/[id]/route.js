import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const { id } = await params;
    const project = await prisma.project.findUnique({
        where: { id },
        include: {
            customer: true,
            quotations: { include: { items: true } },
            milestones: { orderBy: { order: 'asc' } },
            budgets: true,
            contractorPays: { include: { contractor: { select: { name: true, type: true, phone: true } } } },
            employees: { include: { employee: { select: { name: true, position: true, phone: true } } } },
            transactions: { orderBy: { date: 'desc' }, take: 10 },
            contracts: { include: { payments: { orderBy: { createdAt: 'asc' } }, quotation: { select: { code: true } } } },
            workOrders: { orderBy: { createdAt: 'desc' } },
            materialPlans: { include: { product: { select: { name: true, code: true, unit: true } } } },
            purchaseOrders: { include: { items: true }, orderBy: { createdAt: 'desc' } },
            expenses: { orderBy: { date: 'desc' } },
            trackingLogs: { orderBy: { createdAt: 'desc' } },
            documents: { orderBy: { createdAt: 'desc' } },
        },
    });
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // P&L
    const income = project.paidAmount;
    const expense = project.spent;
    const profit = income - expense;
    const profitMargin = income > 0 ? ((profit / income) * 100).toFixed(1) : 0;
    const debtFromCustomer = project.contractValue - project.paidAmount;
    const debtToContractors = project.contractorPays.reduce((s, p) => s + (p.contractAmount - p.paidAmount), 0);

    // Settlement (Quyết toán)
    const totalContractValue = project.contracts.reduce((s, c) => s + c.contractValue, 0);
    const totalVariation = project.contracts.reduce((s, c) => s + c.variationAmount, 0);
    const totalCollected = project.contracts.reduce((s, c) => s + c.paidAmount, 0);
    const totalPurchase = project.purchaseOrders.reduce((s, po) => s + po.totalAmount, 0);
    const totalExpenses = project.expenses.reduce((s, e) => s + e.amount, 0);
    const totalContractorCost = project.contractorPays.reduce((s, p) => s + p.contractAmount, 0);
    const totalCostB = totalPurchase + totalExpenses + totalContractorCost;
    const totalPaidB = project.purchaseOrders.reduce((s, po) => s + po.paidAmount, 0)
        + project.expenses.reduce((s, e) => s + e.paidAmount, 0)
        + project.contractorPays.reduce((s, p) => s + p.paidAmount, 0);

    const settlement = {
        sideA: { contractValue: totalContractValue, variation: totalVariation, total: totalContractValue + totalVariation, collected: totalCollected, remaining: totalContractValue + totalVariation - totalCollected, rate: totalContractValue > 0 ? ((totalCollected / (totalContractValue + totalVariation)) * 100).toFixed(1) : 0 },
        sideB: { purchase: totalPurchase, expenses: totalExpenses, contractor: totalContractorCost, total: totalCostB, paid: totalPaidB, remaining: totalCostB - totalPaidB },
        profit: totalCollected - totalCostB,
        profitRate: totalCollected > 0 ? (((totalCollected - totalCostB) / totalCollected) * 100).toFixed(1) : 0,
    };

    return NextResponse.json({
        ...project,
        pnl: { income, expense, profit, profitMargin, debtFromCustomer, debtToContractors },
        settlement,
    });
}

export async function PUT(request, { params }) {
    const { id } = await params;
    const data = await request.json();
    const project = await prisma.project.update({ where: { id }, data });
    return NextResponse.json(project);
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        await prisma.contractPayment.deleteMany({ where: { contract: { projectId: id } } });
        await prisma.contract.deleteMany({ where: { projectId: id } });
        await prisma.workOrder.deleteMany({ where: { projectId: id } });
        await prisma.materialPlan.deleteMany({ where: { projectId: id } });
        await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrder: { projectId: id } } });
        await prisma.purchaseOrder.deleteMany({ where: { projectId: id } });
        await prisma.projectExpense.deleteMany({ where: { projectId: id } });
        await prisma.trackingLog.deleteMany({ where: { projectId: id } });
        await prisma.projectDocument.deleteMany({ where: { projectId: id } });
        await prisma.projectMilestone.deleteMany({ where: { projectId: id } });
        await prisma.projectBudget.deleteMany({ where: { projectId: id } });
        await prisma.contractorPayment.deleteMany({ where: { projectId: id } });
        await prisma.projectEmployee.deleteMany({ where: { projectId: id } });
        await prisma.inventoryTransaction.deleteMany({ where: { projectId: id } });
        await prisma.transaction.deleteMany({ where: { projectId: id } });
        await prisma.quotationItem.deleteMany({ where: { quotation: { projectId: id } } });
        await prisma.quotation.deleteMany({ where: { projectId: id } });
        await prisma.project.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
