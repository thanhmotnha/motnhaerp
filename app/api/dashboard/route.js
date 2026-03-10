import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const now = new Date();
    const in7days = new Date(now); in7days.setDate(in7days.getDate() + 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
        customerCount, projectCount, productCount, contractCount, workOrderCount,
        income, expense, thisMonthIncome, lastMonthIncome,
        activeProjects, pendingWorkOrders, contractValueAgg,
        recentProjects, projectsByStatus, lowStockProducts,
        overdueWOs, pendingPOs, urgentCommitments, overdueContractPayments,
        openWarranty, pendingLeave, overdueContractPaymentsTotal,
    ] = await Promise.all([
        prisma.customer.count({ where: { deletedAt: null } }),
        prisma.project.count({ where: { deletedAt: null } }),
        prisma.product.count(),
        prisma.contract.count({ where: { deletedAt: null } }),
        prisma.workOrder.count(),
        prisma.transaction.aggregate({ where: { type: 'Thu' }, _sum: { amount: true } }),
        prisma.transaction.aggregate({ where: { type: 'Chi' }, _sum: { amount: true } }),
        prisma.transaction.aggregate({ where: { type: 'Thu', date: { gte: startOfMonth } }, _sum: { amount: true } }),
        prisma.transaction.aggregate({ where: { type: 'Thu', date: { gte: startOfLastMonth, lte: endOfLastMonth } }, _sum: { amount: true } }),
        prisma.project.count({ where: { deletedAt: null, status: { in: ['Thi công', 'Thiết kế', 'Đang thi công'] } } }),
        prisma.workOrder.count({ where: { status: 'Chờ xử lý' } }),
        prisma.contract.aggregate({ where: { deletedAt: null }, _sum: { contractValue: true, paidAmount: true } }),
        prisma.project.findMany({
            where: { deletedAt: null },
            take: 5, orderBy: { updatedAt: 'desc' },
            include: { customer: { select: { name: true } } },
        }),
        prisma.project.groupBy({ by: ['status'], where: { deletedAt: null }, _count: true }),
        // Low stock: stock = 0 OR (minStock > 0 AND stock <= minStock)
        prisma.$queryRaw`
            SELECT id, name, code, stock, "minStock", image
            FROM "Product"
            WHERE "supplyType" != 'Dịch vụ'
              AND (stock = 0 OR ("minStock" > 0 AND stock <= "minStock"))
            ORDER BY stock ASC
            LIMIT 15
        `.catch(() => []),
        prisma.workOrder.findMany({
            where: { dueDate: { lt: now }, status: { notIn: ['Hoàn thành', 'Quá hạn'] } },
            select: { id: true, code: true, title: true, dueDate: true, assignee: true, priority: true, projectId: true, project: { select: { code: true, name: true } } },
            orderBy: { dueDate: 'asc' }, take: 10,
        }).catch(() => []),
        prisma.purchaseOrder.findMany({
            where: { status: 'Chờ duyệt' },
            select: { id: true, code: true, supplier: true, totalAmount: true, orderDate: true, project: { select: { code: true, name: true } } },
            orderBy: { orderDate: 'asc' }, take: 10,
        }).catch(() => []),
        prisma.commitment.findMany({
            where: { status: 'pending', deadline: { lte: in7days, gte: now } },
            select: { id: true, title: true, deadline: true, assignee: true, projectId: true, project: { select: { code: true, name: true } } },
            orderBy: { deadline: 'asc' }, take: 10,
        }).catch(() => []),
        prisma.contractPayment.findMany({
            where: { status: { notIn: ['Đã thu', 'Đã thanh toán'] }, dueDate: { lte: in7days, gte: now } },
            select: { id: true, phase: true, amount: true, dueDate: true, contractId: true, contract: { select: { code: true, project: { select: { name: true } } } } },
            orderBy: { dueDate: 'asc' }, take: 10,
        }).catch(() => []),
        // Bảo hành đang mở
        prisma.warrantyTicket.count({ where: { status: { in: ['Mới', 'Đang xử lý'] } } }).catch(() => 0),
        // Đơn nghỉ phép chờ duyệt
        prisma.leaveRequest.count({ where: { status: 'Chờ duyệt' } }).catch(() => 0),
        // Tổng phải thu quá hạn
        prisma.contractPayment.aggregate({
            where: { status: { notIn: ['Đã thu', 'Đã thanh toán'] }, dueDate: { lt: now } },
            _sum: { amount: true },
        }).catch(() => ({ _sum: { amount: 0 } })),
    ]);

    const thisMonthRev = thisMonthIncome._sum.amount || 0;
    const lastMonthRev = lastMonthIncome._sum.amount || 0;
    const revenueGrowth = lastMonthRev > 0 ? Math.round((thisMonthRev - lastMonthRev) / lastMonthRev * 100) : null;

    return NextResponse.json({
        stats: {
            revenue: income._sum.amount || 0,
            expense: expense._sum.amount || 0,
            thisMonthRevenue: thisMonthRev,
            lastMonthRevenue: lastMonthRev,
            revenueGrowth,
            projects: projectCount,
            activeProjects,
            customers: customerCount,
            products: productCount,
            contracts: contractCount,
            workOrders: workOrderCount,
            pendingWorkOrders,
            totalContractValue: contractValueAgg._sum.contractValue || 0,
            totalPaid: contractValueAgg._sum.paidAmount || 0,
            openWarranty,
            pendingLeave,
            overdueReceivable: overdueContractPaymentsTotal._sum.amount || 0,
        },
        recentProjects,
        projectsByStatus,
        lowStockProducts,
        todayTasks: {
            overdueWOs,
            pendingPOs,
            urgentCommitments,
            overdueContractPayments,
        },
    });
});
