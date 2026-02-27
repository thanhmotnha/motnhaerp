import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const { id } = await params;
    const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
            projects: {
                include: {
                    milestones: { orderBy: { order: 'asc' } },
                    contracts: { select: { id: true, code: true, name: true, contractValue: true, paidAmount: true, status: true } },
                    _count: { select: { workOrders: true, expenses: true } },
                },
                orderBy: { createdAt: 'desc' },
            },
            quotations: { include: { items: true }, orderBy: { createdAt: 'desc' } },
            contracts: {
                include: {
                    payments: { orderBy: { createdAt: 'asc' } },
                    project: { select: { name: true, code: true } },
                },
                orderBy: { createdAt: 'desc' },
            },
        },
    });
    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Get tracking logs for all customer's projects + customer-level
    const projectIds = customer.projects.map(p => p.id);
    const trackingLogs = await prisma.trackingLog.findMany({
        where: { OR: [{ customerId: id }, ...(projectIds.length > 0 ? [{ projectId: { in: projectIds } }] : [])] },
        include: { project: { select: { name: true, code: true } } },
        orderBy: { createdAt: 'desc' },
    });

    // Get recent transactions
    const transactions = projectIds.length > 0 ? await prisma.transaction.findMany({
        where: { projectId: { in: projectIds } },
        include: { project: { select: { name: true, code: true } } },
        orderBy: { date: 'desc' },
        take: 20,
    }) : [];

    // Aggregates
    const totalContractValue = customer.contracts.reduce((s, c) => s + c.contractValue, 0);
    const totalPaid = customer.contracts.reduce((s, c) => s + c.paidAmount, 0);
    const totalDebt = totalContractValue - totalPaid;

    return NextResponse.json({
        ...customer,
        trackingLogs,
        transactions,
        stats: { totalContractValue, totalPaid, totalDebt, projectCount: customer.projects.length, contractCount: customer.contracts.length },
    });
}

export async function PUT(request, { params }) {
    const { id } = await params;
    const data = await request.json();
    const customer = await prisma.customer.update({ where: { id }, data });
    return NextResponse.json(customer);
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        const projects = await prisma.project.findMany({ where: { customerId: id }, select: { id: true } });
        const projectIds = projects.map(p => p.id);

        if (projectIds.length > 0) {
            // Delete all project child records
            await prisma.contractPayment.deleteMany({ where: { contract: { projectId: { in: projectIds } } } });
            await prisma.contract.deleteMany({ where: { projectId: { in: projectIds } } });
            await prisma.workOrder.deleteMany({ where: { projectId: { in: projectIds } } });
            await prisma.materialPlan.deleteMany({ where: { projectId: { in: projectIds } } });
            await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrder: { projectId: { in: projectIds } } } });
            await prisma.purchaseOrder.deleteMany({ where: { projectId: { in: projectIds } } });
            await prisma.projectExpense.deleteMany({ where: { projectId: { in: projectIds } } });
            await prisma.trackingLog.deleteMany({ where: { projectId: { in: projectIds } } });
            await prisma.projectDocument.deleteMany({ where: { projectId: { in: projectIds } } });
            await prisma.projectMilestone.deleteMany({ where: { projectId: { in: projectIds } } });
            await prisma.projectBudget.deleteMany({ where: { projectId: { in: projectIds } } });
            await prisma.contractorPayment.deleteMany({ where: { projectId: { in: projectIds } } });
            await prisma.projectEmployee.deleteMany({ where: { projectId: { in: projectIds } } });
            await prisma.inventoryTransaction.deleteMany({ where: { projectId: { in: projectIds } } });
            await prisma.transaction.deleteMany({ where: { projectId: { in: projectIds } } });
            await prisma.quotationItem.deleteMany({ where: { quotation: { projectId: { in: projectIds } } } });
            await prisma.quotation.deleteMany({ where: { projectId: { in: projectIds } } });
            await prisma.project.deleteMany({ where: { customerId: id } });
        }
        // Delete customer-level quotations (not linked to project)
        await prisma.quotationItem.deleteMany({ where: { quotation: { customerId: id } } });
        await prisma.quotation.deleteMany({ where: { customerId: id } });
        // Delete customer-level contracts
        await prisma.contractPayment.deleteMany({ where: { contract: { customerId: id } } });
        await prisma.contract.deleteMany({ where: { customerId: id } });
        // Delete customer-level tracking logs & documents
        await prisma.trackingLog.deleteMany({ where: { customerId: id } });
        await prisma.projectDocument.deleteMany({ where: { customerId: id } });
        await prisma.customer.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Delete customer error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
