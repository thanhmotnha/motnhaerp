import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const [customerCount, projectCount, productCount, quotationCount, contractCount, workOrderCount] = await Promise.all([
        prisma.customer.count(),
        prisma.project.count(),
        prisma.product.count(),
        prisma.quotation.count(),
        prisma.contract.count(),
        prisma.workOrder.count(),
    ]);

    const income = await prisma.transaction.aggregate({ where: { type: 'Thu' }, _sum: { amount: true } });
    const expense = await prisma.transaction.aggregate({ where: { type: 'Chi' }, _sum: { amount: true } });

    const activeProjects = await prisma.project.count({ where: { status: { in: ['Thi công', 'Thiết kế', 'Đang thi công'] } } });
    const pendingWorkOrders = await prisma.workOrder.count({ where: { status: 'Chờ xử lý' } });
    const contractValueAgg = await prisma.contract.aggregate({ _sum: { contractValue: true, paidAmount: true } });

    const recentProjects = await prisma.project.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: { customer: { select: { name: true } } },
    });

    const projectsByStatus = await prisma.project.groupBy({ by: ['status'], _count: true });

    return NextResponse.json({
        stats: {
            revenue: income._sum.amount || 0,
            expense: expense._sum.amount || 0,
            projects: projectCount,
            activeProjects,
            customers: customerCount,
            products: productCount,
            quotations: quotationCount,
            contracts: contractCount,
            workOrders: workOrderCount,
            pendingWorkOrders,
            totalContractValue: contractValueAgg._sum.contractValue || 0,
            totalPaid: contractValueAgg._sum.paidAmount || 0,
        },
        recentProjects,
        projectsByStatus,
    });
});
