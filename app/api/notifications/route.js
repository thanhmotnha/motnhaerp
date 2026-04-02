import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

import { buildAssignedProjectWhere } from '@/lib/projectAccess';

function buildProjectIdFilter(projectIds) {
    if (!Array.isArray(projectIds)) return {};
    return {
        in: projectIds.length > 0 ? projectIds : ['__no_assigned_project__'],
    };
}

export const GET = withAuth(async (request, context, session) => {
    const now = new Date();
    const notifications = [];
    const assignedProjectWhere = buildAssignedProjectWhere(session?.user);
    const assignedProjects = assignedProjectWhere
        ? await prisma.project.findMany({
            where: {
                deletedAt: null,
                ...assignedProjectWhere,
            },
            select: { id: true, name: true },
        })
        : null;
    const assignedProjectIds = assignedProjects?.map((project) => project.id) || null;
    const projectIdFilter = buildProjectIdFilter(assignedProjectIds);
    const singleProjectId = assignedProjectIds?.length === 1 ? assignedProjectIds[0] : null;

    const [overdueWOs, pendingPOs, overduePayments, pendingExpenses, lowStock, pendingLeave, openWarranty] = await Promise.all([
        prisma.workOrder.count({
            where: {
                dueDate: { lt: now },
                status: { notIn: ['Hoàn thành', 'Đã hủy'] },
                deletedAt: null,
                ...(assignedProjectIds ? { projectId: projectIdFilter } : {}),
            },
        }).catch(() => 0),
        prisma.purchaseOrder.count({
            where: {
                status: 'Chờ duyệt',
                ...(assignedProjectIds ? { projectId: projectIdFilter } : {}),
            },
        }).catch(() => 0),
        prisma.contractPayment.count({
            where: {
                status: { notIn: ['Đã thu', 'Đã thanh toán'] },
                dueDate: { lt: now },
                ...(assignedProjectIds
                    ? { contract: { projectId: projectIdFilter } }
                    : {}),
            },
        }).catch(() => 0),
        prisma.projectExpense.count({
            where: {
                status: 'Chờ duyệt',
                deletedAt: null,
                ...(assignedProjectIds ? { projectId: projectIdFilter } : {}),
            },
        }).catch(() => 0),
        prisma.$queryRaw`SELECT COUNT(*) as count FROM "Product" WHERE "supplyType" != 'Dịch vụ' AND (stock = 0 OR ("minStock" > 0 AND stock <= "minStock"))`.catch(() => [{ count: 0 }]),
        prisma.leaveRequest.count({ where: { status: 'Chờ duyệt' } }).catch(() => 0),
        prisma.warrantyTicket.count({
            where: {
                status: { in: ['Mới', 'Đang xử lý'] },
                ...(assignedProjectIds ? { projectId: projectIdFilter } : {}),
            },
        }).catch(() => 0),
    ]);

    const lowStockCount = Number(lowStock?.[0]?.count || 0);

    if (overdueWOs > 0) {
        notifications.push({
            type: 'warning',
            icon: '⚠️',
            title: `${overdueWOs} phiếu công việc quá hạn`,
            link: '/work-orders',
            route: '/schedule',
            source: 'computed',
            ...(singleProjectId ? { projectId: singleProjectId } : {}),
        });
    }
    if (pendingPOs > 0) {
        notifications.push({
            type: 'info',
            icon: '📋',
            title: `${pendingPOs} PO chờ duyệt`,
            link: '/purchasing',
            route: '/purchasing',
            source: 'computed',
            ...(singleProjectId ? { projectId: singleProjectId } : {}),
        });
    }
    if (overduePayments > 0) {
        notifications.push({
            type: 'danger',
            icon: '💰',
            title: `${overduePayments} đợt thanh toán quá hạn`,
            link: '/payments',
            route: '/dashboard',
            source: 'computed',
        });
    }
    if (pendingExpenses > 0) {
        notifications.push({
            type: 'info',
            icon: '🧾',
            title: `${pendingExpenses} chi phí chờ duyệt`,
            link: '/expenses',
            route: '/approvals',
            source: 'computed',
            ...(singleProjectId ? { projectId: singleProjectId } : {}),
        });
    }
    if (lowStockCount > 0) {
        notifications.push({
            type: 'warning',
            icon: '📦',
            title: `${lowStockCount} sản phẩm hết/sắp hết hàng`,
            link: '/products',
            route: '/material-request',
            source: 'computed',
        });
    }
    if (pendingLeave > 0) {
        notifications.push({
            type: 'info',
            icon: '🗓️',
            title: `${pendingLeave} đơn nghỉ phép chờ duyệt`,
            link: '/hr',
            route: '/leave-request',
            source: 'computed',
        });
    }
    if (openWarranty > 0) {
        notifications.push({
            type: 'danger',
            icon: '🛡️',
            title: `${openWarranty} ticket bảo hành đang mở`,
            link: '/projects',
            route: '/warranty',
            source: 'computed',
            ...(singleProjectId ? { projectId: singleProjectId } : {}),
        });
    }

    const persisted = await prisma.notification.findMany({
        where: {
            createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
        take: 50,
    });

    for (const notification of persisted) {
        notifications.push({
            id: notification.id,
            type: notification.type,
            icon: notification.icon,
            title: notification.title,
            message: notification.message,
            link: notification.link,
            source: notification.source || 'persisted',
            isRead: notification.isRead,
            createdAt: notification.createdAt,
        });
    }

    const unreadCount =
        notifications.filter((item) => !item.isRead && item.source !== 'computed').length
        + notifications.filter((item) => item.source === 'computed').length;

    return NextResponse.json({
        data: notifications,
        count: notifications.length,
        unreadCount,
    });
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { type, icon, title, message, link, source, expiresAt } = body;

    if (!type || !title) {
        return NextResponse.json({ error: 'type và title là bắt buộc' }, { status: 400 });
    }

    const notification = await prisma.notification.create({
        data: {
            type,
            icon: icon || '',
            title,
            message: message || '',
            link: link || '',
            source: source || '',
            expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
    });

    return NextResponse.json(notification, { status: 201 });
});

export const PATCH = withAuth(async () => {
    await prisma.notification.updateMany({
        where: { isRead: false },
        data: { isRead: true, readAt: new Date() },
    });

    return NextResponse.json({ success: true });
});
