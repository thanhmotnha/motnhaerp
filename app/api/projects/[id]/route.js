import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { projectUpdateSchema } from '@/lib/validations/project';
import { buildAssignedProjectWhere } from '@/lib/projectAccess';

export const GET = withAuth(async (_request, { params }, session) => {
    const { id } = await params;
    const filters = [{ OR: [{ id }, { code: id }] }];
    const assignedProjectWhere = buildAssignedProjectWhere(session?.user);
    if (assignedProjectWhere) filters.push(assignedProjectWhere);

    const project = await prisma.project.findFirst({
        where: {
            deletedAt: null,
            AND: filters,
        },
        include: {
            customer: true,
            quotations: { include: { items: true } },
            milestones: { orderBy: { order: 'asc' } },
            budgets: true,
            contractorPays: { include: { contractor: { select: { name: true, type: true, phone: true } }, items: { orderBy: { acceptedAt: 'asc' } } } },
            employees: { include: { employee: { select: { name: true, position: true, phone: true } } } },
            transactions: { orderBy: { date: 'desc' }, take: 10 },
            contracts: { include: { payments: { orderBy: { createdAt: 'asc' } }, quotation: { select: { code: true } } } },
            workOrders: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
            materialPlans: { include: { product: { select: { name: true, code: true, unit: true } } } },
            requisitions: { orderBy: { createdAt: 'desc' } },
            purchaseOrders: { include: { items: true, supplierRel: { select: { name: true, phone: true, address: true, taxCode: true, bankAccount: true, bankName: true } } }, orderBy: { createdAt: 'desc' } },
            expenses: { where: { deletedAt: null }, orderBy: { date: 'desc' } },
            stockIssues: { include: { items: true } },
            trackingLogs: { orderBy: { createdAt: 'desc' } },
            documents: { where: { parentDocumentId: null }, orderBy: { createdAt: 'desc' }, include: { folder: { select: { name: true } }, _count: { select: { versions: true } } } },
            documentFolders: { where: { parentId: null }, orderBy: { order: 'asc' }, include: { _count: { select: { documents: true } }, children: { orderBy: { order: 'asc' }, include: { _count: { select: { documents: true } } } } } },
        },
    });
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Revenue = sum of actual payments from ContractPayment records
    // Only count signed/active contracts (exclude drafts and soft-deleted)
    const activeContracts = project.contracts.filter(c => !c.deletedAt && c.status !== 'Nháp');
    const totalContractValue = activeContracts.reduce((s, c) => s + (c.contractValue ?? 0), 0);
    const totalVariation = activeContracts.reduce((s, c) => s + (c.variationAmount ?? 0), 0);
    const totalA = totalContractValue + totalVariation;

    // Actual collected = sum of paidAmount in each ContractPayment (per-phase payment)
    const totalCollected = activeContracts.reduce((s, c) =>
        s + c.payments.reduce((ps, pay) => ps + (pay.paidAmount ?? 0), 0), 0);

    // Settlement (Quyet toan) — allocation-aware expense totals
    const totalPurchase = project.purchaseOrders.reduce((s, po) => s + (po.totalAmount ?? 0), 0);
    const totalStockIssue = project.stockIssues.reduce((s, si) =>
        s + si.items.reduce((is, item) => is + (item.qty * item.unitPrice), 0), 0);
    const totalContractorCost = project.contractorPays.reduce((s, p) => s + (p.contractAmount ?? 0), 0);

    // Fetch allocation-aware expense totals in parallel
    const [directExpenseAgg, allocatedExpenseAgg] = await Promise.all([
        prisma.projectExpense.aggregate({
            where: { projectId: project.id, deletedAt: null, status: { not: 'Từ chối' }, allocations: { none: {} } },
            _sum: { amount: true },
        }),
        prisma.expenseAllocation.aggregate({
            where: { projectId: project.id, expense: { status: { not: 'Từ chối' }, deletedAt: null } },
            _sum: { amount: true },
        }),
    ]);
    const totalExpenses = Number(directExpenseAgg._sum.amount || 0) + Number(allocatedExpenseAgg._sum.amount || 0);

    const totalCostB = totalPurchase + totalStockIssue + totalExpenses + totalContractorCost;

    // P&L — uses actual collected + live cost totals (not stale project.spent)
    const income = totalCollected;
    const expense = totalCostB;
    const profit = income - expense;
    const profitMargin = income > 0 ? ((profit / income) * 100).toFixed(1) : 0;
    const debtFromCustomer = totalA - totalCollected;
    const debtToContractors = project.contractorPays.reduce((s, p) => s + ((p.contractAmount ?? 0) - (p.paidAmount ?? 0)), 0);
    const totalPaidB = project.purchaseOrders.reduce((s, po) => s + (po.paidAmount ?? 0), 0)
        + project.expenses.reduce((s, e) => s + (e.paidAmount ?? 0), 0)
        + project.contractorPays.reduce((s, p) => s + (p.paidAmount ?? 0), 0)
        + totalStockIssue; // vật tư xuất kho: đã thanh toán khi nhập kho

    const settlement = {
        sideA: { contractValue: totalContractValue, variation: totalVariation, total: totalA, collected: totalCollected, remaining: totalA - totalCollected, rate: totalA > 0 ? ((totalCollected / totalA) * 100).toFixed(1) : 0 },
        sideB: { purchase: totalPurchase, stockIssue: totalStockIssue, expenses: totalExpenses, contractor: totalContractorCost, total: totalCostB, paid: totalPaidB, remaining: totalCostB - totalPaidB },
        profit: totalCollected - totalCostB,
        profitRate: totalCollected > 0 ? (((totalCollected - totalCostB) / totalCollected) * 100).toFixed(1) : 0,
    };

    // Compute milestone-based progress if milestones exist
    const msProgress = project.milestones.length > 0
        ? Math.round(project.milestones.reduce((s, m) => s + (m.progress ?? 0), 0) / project.milestones.length)
        : project.progress ?? 0;

    return NextResponse.json({
        ...project,
        // Null-safe numeric fields
        area: project.area ?? 0,
        floors: project.floors ?? 0,
        budget: project.budget ?? 0,
        spent: project.spent ?? 0,
        progress: msProgress,
        // Sync from contracts — real computed values (base + variation)
        contractValue: totalA || project.contractValue || 0,
        baseContractValue: totalContractValue,
        variationAmount: totalVariation,
        paidAmount: totalCollected,
        pnl: { income, expense, profit, profitMargin, debtFromCustomer, debtToContractors },
        settlement,
    });
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const data = projectUpdateSchema.parse(body);

    const target = await prisma.project.findFirst({ where: { OR: [{ id }, { code: id }] }, select: { id: true } });
    const projectId = target?.id || id;

    const project = await prisma.project.update({ where: { id: projectId }, data });
    return NextResponse.json(project);
}, { entityType: 'Project' });

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;

    const target = await prisma.project.findFirst({ where: { OR: [{ id }, { code: id }] }, select: { id: true } });
    const projectId = target?.id || id;

    await prisma.$transaction(async (tx) => {
        await tx.contractPayment.deleteMany({ where: { contract: { projectId: projectId } } });
        await tx.contract.deleteMany({ where: { projectId: projectId } });
        await tx.workOrder.deleteMany({ where: { projectId: projectId } });
        await tx.materialPlan.deleteMany({ where: { projectId: projectId } });
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrder: { projectId: projectId } } });
        await tx.purchaseOrder.deleteMany({ where: { projectId: projectId } });
        await tx.projectExpense.deleteMany({ where: { projectId: projectId } });
        await tx.trackingLog.deleteMany({ where: { projectId: projectId } });
        await tx.projectDocument.deleteMany({ where: { projectId: projectId } });
        await tx.documentFolder.deleteMany({ where: { parentId: { not: null }, projectId: projectId } });
        await tx.documentFolder.deleteMany({ where: { projectId: projectId } });
        await tx.projectMilestone.deleteMany({ where: { projectId: projectId } });
        await tx.projectBudget.deleteMany({ where: { projectId: projectId } });
        await tx.contractorPayment.deleteMany({ where: { projectId: projectId } });
        await tx.projectEmployee.deleteMany({ where: { projectId: projectId } });
        await tx.inventoryTransaction.deleteMany({ where: { projectId: projectId } });
        await tx.transaction.deleteMany({ where: { projectId: projectId } });
        await tx.quotationItem.deleteMany({ where: { quotation: { projectId: projectId } } });
        await tx.quotation.deleteMany({ where: { projectId: projectId } });
        await tx.project.delete({ where: { id: projectId } });
    });

    return NextResponse.json({ success: true });
}, { entityType: 'Project' });
