import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/notifications — Lấy notifications cho user
export const GET = withAuth(async (request, context, session) => {
    const now = new Date();
    const in7days = new Date(now); in7days.setDate(in7days.getDate() + 7);
    const notifications = [];

    // 1. Overdue Work Orders
    const overdueWOs = await prisma.workOrder.count({
        where: { dueDate: { lt: now }, status: { notIn: ['Hoàn thành', 'Đã hủy'] }, deletedAt: null },
    }).catch(() => 0);
    if (overdueWOs > 0) {
        notifications.push({
            type: 'warning', icon: '⚠️',
            title: `${overdueWOs} phiếu CV quá hạn`,
            link: '/work-orders',
        });
    }

    // 2. Pending POs
    const pendingPOs = await prisma.purchaseOrder.count({ where: { status: 'Chờ duyệt' } }).catch(() => 0);
    if (pendingPOs > 0) {
        notifications.push({
            type: 'info', icon: '📋',
            title: `${pendingPOs} PO chờ duyệt`,
            link: '/purchasing',
        });
    }

    // 3. Payment reminders
    const overduePayments = await prisma.contractPayment.count({
        where: { status: { notIn: ['Đã thu', 'Đã thanh toán'] }, dueDate: { lt: now } },
    }).catch(() => 0);
    if (overduePayments > 0) {
        notifications.push({
            type: 'danger', icon: '💰',
            title: `${overduePayments} đợt thanh toán quá hạn`,
            link: '/payments',
        });
    }

    // 4. Pending expenses
    const pendingExpenses = await prisma.projectExpense.count({
        where: { status: 'Chờ duyệt', deletedAt: null },
    }).catch(() => 0);
    if (pendingExpenses > 0) {
        notifications.push({
            type: 'info', icon: '🧾',
            title: `${pendingExpenses} chi phí chờ duyệt`,
            link: '/expenses',
        });
    }

    // 5. Low stock products
    const lowStock = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "Product"
        WHERE "supplyType" != 'Dịch vụ'
        AND (stock = 0 OR ("minStock" > 0 AND stock <= "minStock"))
    `.catch(() => [{ count: 0 }]);
    const lowStockCount = Number(lowStock[0]?.count || 0);
    if (lowStockCount > 0) {
        notifications.push({
            type: 'warning', icon: '📦',
            title: `${lowStockCount} sản phẩm hết/sắp hết hàng`,
            link: '/products',
        });
    }

    // 6. Pending leave requests
    const pendingLeave = await prisma.leaveRequest.count({ where: { status: 'Chờ duyệt' } }).catch(() => 0);
    if (pendingLeave > 0) {
        notifications.push({
            type: 'info', icon: '🗓️',
            title: `${pendingLeave} đơn nghỉ phép chờ duyệt`,
            link: '/hr',
        });
    }

    // 7. Open warranty
    const openWarranty = await prisma.warrantyTicket.count({
        where: { status: { in: ['Mới', 'Đang xử lý'] } },
    }).catch(() => 0);
    if (openWarranty > 0) {
        notifications.push({
            type: 'danger', icon: '🛡️',
            title: `${openWarranty} ticket bảo hành đang mở`,
            link: '/projects',
        });
    }

    return NextResponse.json({ data: notifications, count: notifications.length });
});
