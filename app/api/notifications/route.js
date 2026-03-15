import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/notifications — Merge computed (real-time) + persisted notifications
export const GET = withAuth(async (request, context, session) => {
    const now = new Date();
    const in7days = new Date(now); in7days.setDate(in7days.getDate() + 7);
    const notifications = [];

    // ── Computed real-time notifications ──────────────────────
    const [overdueWOs, pendingPOs, overduePayments, pendingExpenses, lowStock, pendingLeave, openWarranty] = await Promise.all([
        prisma.workOrder.count({ where: { dueDate: { lt: now }, status: { notIn: ['Hoàn thành', 'Đã hủy'] }, deletedAt: null } }).catch(() => 0),
        prisma.purchaseOrder.count({ where: { status: 'Chờ duyệt' } }).catch(() => 0),
        prisma.contractPayment.count({ where: { status: { notIn: ['Đã thu', 'Đã thanh toán'] }, dueDate: { lt: now } } }).catch(() => 0),
        prisma.projectExpense.count({ where: { status: 'Chờ duyệt', deletedAt: null } }).catch(() => 0),
        prisma.$queryRaw`SELECT COUNT(*) as count FROM "Product" WHERE "supplyType" != 'Dịch vụ' AND (stock = 0 OR ("minStock" > 0 AND stock <= "minStock"))`.catch(() => [{ count: 0 }]),
        prisma.leaveRequest.count({ where: { status: 'Chờ duyệt' } }).catch(() => 0),
        prisma.warrantyTicket.count({ where: { status: { in: ['Mới', 'Đang xử lý'] } } }).catch(() => 0),
    ]);

    const lowStockCount = Number(lowStock[0]?.count || 0);

    if (overdueWOs > 0) notifications.push({ type: 'warning', icon: '⚠️', title: `${overdueWOs} phiếu CV quá hạn`, link: '/work-orders', source: 'computed' });
    if (pendingPOs > 0) notifications.push({ type: 'info', icon: '📋', title: `${pendingPOs} PO chờ duyệt`, link: '/purchasing', source: 'computed' });
    if (overduePayments > 0) notifications.push({ type: 'danger', icon: '💰', title: `${overduePayments} đợt thanh toán quá hạn`, link: '/payments', source: 'computed' });
    if (pendingExpenses > 0) notifications.push({ type: 'info', icon: '🧾', title: `${pendingExpenses} chi phí chờ duyệt`, link: '/expenses', source: 'computed' });
    if (lowStockCount > 0) notifications.push({ type: 'warning', icon: '📦', title: `${lowStockCount} sản phẩm hết/sắp hết hàng`, link: '/products', source: 'computed' });
    if (pendingLeave > 0) notifications.push({ type: 'info', icon: '🗓️', title: `${pendingLeave} đơn nghỉ phép chờ duyệt`, link: '/hr', source: 'computed' });
    if (openWarranty > 0) notifications.push({ type: 'danger', icon: '🛡️', title: `${openWarranty} ticket bảo hành đang mở`, link: '/projects', source: 'computed' });

    // ── Persisted notifications (last 30 days, unread first) ──
    const persisted = await prisma.notification.findMany({
        where: {
            createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
        take: 50,
    });

    for (const n of persisted) {
        notifications.push({
            id: n.id,
            type: n.type,
            icon: n.icon,
            title: n.title,
            message: n.message,
            link: n.link,
            source: n.source || 'persisted',
            isRead: n.isRead,
            createdAt: n.createdAt,
        });
    }

    const unreadCount = notifications.filter(n => !n.isRead && n.source !== 'computed').length + notifications.filter(n => n.source === 'computed').length;

    return NextResponse.json({ data: notifications, count: notifications.length, unreadCount });
});

// POST /api/notifications — Create a persisted notification
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

// PATCH /api/notifications — Mark all as read
export const PATCH = withAuth(async () => {
    await prisma.notification.updateMany({
        where: { isRead: false },
        data: { isRead: true, readAt: new Date() },
    });
    return NextResponse.json({ success: true });
});
