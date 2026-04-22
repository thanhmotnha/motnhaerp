/**
 * Zalo OA messaging helpers — gửi tin tới nhân viên qua Zalo user_id.
 * Endpoint: POST /v3.0/oa/message/cs (tin tư vấn, free trong 24h window)
 *
 * Hỗ trợ:
 *  - sendZaloToUser(userId, text)       → 1 user (User.id của ERP)
 *  - sendZaloToUsers(userIds, text)     → nhiều user
 *  - sendZaloToRole(role, text)         → tất cả user có role đó
 *  - sendZaloToZaloId(zaloUserId, text) → trực tiếp bằng zalo_user_id
 *  - broadcastToAll(text)               → tất cả nhân viên có zaloUserId
 *
 * Tự động skip nếu user chưa có zaloUserId hoặc chưa cấu hình zaloOaToken.
 */

import prisma from '@/lib/prisma';
import { getSetting } from '@/lib/settingsHelper';

const ZALO_OA_ENDPOINT = 'https://openapi.zalo.me/v3.0/oa/message/cs';

async function postMessage(token, zaloUserId, text) {
    try {
        const r = await fetch(ZALO_OA_ENDPOINT, {
            method: 'POST',
            headers: { access_token: token, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: { user_id: zaloUserId },
                message: { text },
            }),
        });
        const json = await r.json().catch(() => ({}));
        if (json.error) console.error('[ZaloNotify]', zaloUserId, json.error, json.message);
        return !json.error;
    } catch (e) {
        console.error('[ZaloNotify]', zaloUserId, e.message);
        return false;
    }
}

export async function sendZaloToZaloId(zaloUserId, text) {
    if (!zaloUserId || !text) return false;
    const token = await getSetting('zaloOaToken');
    if (!token) return false;
    return postMessage(token, zaloUserId, text);
}

export async function sendZaloToUser(userId, text) {
    if (!userId) return false;
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { zaloUserId: true },
    });
    if (!user?.zaloUserId) return false;
    return sendZaloToZaloId(user.zaloUserId, text);
}

export async function sendZaloToUsers(userIds, text) {
    if (!userIds?.length) return { sent: 0, total: 0 };
    const token = await getSetting('zaloOaToken');
    if (!token) return { sent: 0, total: userIds.length, skipped: 'no token' };

    const users = await prisma.user.findMany({
        where: { id: { in: userIds }, zaloUserId: { not: '' } },
        select: { zaloUserId: true },
    });
    const results = await Promise.all(users.map(u => postMessage(token, u.zaloUserId, text)));
    return { sent: results.filter(Boolean).length, total: userIds.length };
}

export async function sendZaloToRole(role, text) {
    if (!role) return { sent: 0, total: 0 };
    const token = await getSetting('zaloOaToken');
    if (!token) return { sent: 0, total: 0, skipped: 'no token' };

    const users = await prisma.user.findMany({
        where: { role, active: true, zaloUserId: { not: '' } },
        select: { zaloUserId: true },
    });
    const results = await Promise.all(users.map(u => postMessage(token, u.zaloUserId, text)));
    return { sent: results.filter(Boolean).length, total: users.length };
}

export async function broadcastToAll(text) {
    const token = await getSetting('zaloOaToken');
    if (!token) return { sent: 0, total: 0, skipped: 'no token' };
    const users = await prisma.user.findMany({
        where: { active: true, zaloUserId: { not: '' } },
        select: { zaloUserId: true },
    });
    const results = await Promise.all(users.map(u => postMessage(token, u.zaloUserId, text)));
    return { sent: results.filter(Boolean).length, total: users.length };
}

// ──────────────────────────────────────────────
// Preformatted event helpers
// ──────────────────────────────────────────────

/** Lead mới (giữ lại cho backward-compat với leadIntake.js) */
export async function sendZaloLeadNotification({ name, phone, source }) {
    try {
        const token = await getSetting('zaloOaToken');
        const recipientsRaw = await getSetting('zaloRecipients');
        if (!token || !recipientsRaw) return;
        const recipients = recipientsRaw.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
        await Promise.all(recipients.map(userId =>
            postMessage(token, userId, `🔔 Lead mới [${source}]\n👤 ${name}\n📞 ${phone}`)
        ));
    } catch (e) {
        console.error('[ZaloNotify]', e.message);
    }
}

export async function notifyTaskAssigned(taskId) {
    const task = await prisma.workshopTask.findUnique({
        where: { id: taskId },
        include: {
            worker: { select: { zaloUserId: true } },
            assignedBy: { select: { name: true } },
            project: { select: { name: true } },
        },
    });
    if (!task?.worker?.zaloUserId) return;
    const due = new Date(task.dueDate).toLocaleDateString('vi-VN');
    const pri = task.priority === 'Gấp' ? '🔴 GẤP · ' : task.priority === 'Cao' ? '🟡 Cao · ' : '';
    const text = [
        `🔨 Việc mới: ${task.title}`,
        `${pri}Deadline: ${due}`,
        task.project?.name ? `📁 ${task.project.name}` : '',
        task.description ? `\n${task.description}` : '',
        `\n👤 Giao bởi: ${task.assignedBy?.name || '—'}`,
    ].filter(Boolean).join('\n');
    return sendZaloToZaloId(task.worker.zaloUserId, text);
}

export async function notifyPendingApproval({ type, code, description, amount, requestedBy, projectName }) {
    const amountStr = amount != null ? new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + 'đ' : '';
    const text = [
        `⚠ ${type} cần duyệt: ${code}`,
        description,
        amountStr ? `💰 Giá trị: ${amountStr}` : '',
        projectName ? `📁 ${projectName}` : '',
        requestedBy ? `👤 Từ: ${requestedBy}` : '',
        `\nVào ERP duyệt ngay.`,
    ].filter(Boolean).join('\n');
    return sendZaloToRole('giam_doc', text);
}

export async function notifyCustomerAssigned(customerId, salesPersonId) {
    const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { code: true, name: true, phone: true, pipelineStage: true },
    });
    if (!customer) return;
    const text = [
        `💼 Bạn vừa được gán khách: ${customer.code}`,
        `👤 ${customer.name}`,
        `📞 ${customer.phone}`,
        customer.pipelineStage ? `📊 Stage: ${customer.pipelineStage}` : '',
        `\nMở ERP để xem và check-in.`,
    ].filter(Boolean).join('\n');
    return sendZaloToUser(salesPersonId, text);
}

export async function notifyPaymentReceived({ contractCode, customerName, amount, receivedBy }) {
    const amountStr = new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + 'đ';
    const text = [
        `💰 Đã thu ${amountStr}`,
        `📄 HĐ: ${contractCode}`,
        `👤 KH: ${customerName}`,
        receivedBy ? `\n✓ Thu bởi: ${receivedBy}` : '',
    ].filter(Boolean).join('\n');
    return sendZaloToRole('giam_doc', text);
}

export async function notifyServiceDebtPayment({ debtCode, recipientName, serviceCategory, amountPaid, remaining, projectAllocations }) {
    const amountStr = new Intl.NumberFormat('vi-VN').format(Math.round(amountPaid)) + 'đ';
    const remStr = new Intl.NumberFormat('vi-VN').format(Math.round(remaining)) + 'đ';
    const lines = [
        `💸 Đã trả ${amountStr} cho ${recipientName}`,
        `📋 ${debtCode} · ${serviceCategory || 'Dịch vụ'}`,
        remaining > 0 ? `💰 Còn nợ: ${remStr}` : `✅ Đã trả hết`,
        '',
        `📊 Chi phí phân bổ dự án:`,
        ...projectAllocations.map(a => `  • ${a.projectName}: ${new Intl.NumberFormat('vi-VN').format(Math.round(a.amount))}đ (${Math.round(a.ratio * 100)}%)`),
    ];
    return sendZaloToRole('giam_doc', lines.join('\n'));
}
