/**
 * OpenClaw webhook sender
 * ERP → POST → OpenClaw (đã kết nối sẵn Zalo + Lark)
 *
 * Env:
 *   OPENCLAW_WEBHOOK_URL    — URL endpoint webhook của OpenClaw
 *   OPENCLAW_WEBHOOK_SECRET — Secret header để xác thực (X-Webhook-Secret)
 */

export const isOpenClawConfigured = !!process.env.OPENCLAW_WEBHOOK_URL;

/**
 * Send a message via OpenClaw webhook
 *
 * @param {Object} opts
 * @param {string} opts.event       - "customer_birthday" | "employee_birthday" | "holiday_greeting" | "payslip"
 * @param {string} opts.channel     - "zalo" | "lark"
 * @param {string} opts.to          - Số điện thoại (Zalo) hoặc user/chat ID (Lark)
 * @param {string} opts.message     - Nội dung tin nhắn
 * @param {Object} [opts.customer]  - { id, name } — mã & tên khách/nhân viên
 * @param {string} [opts.requestId] - Dedup key (tự sinh nếu không truyền)
 * @param {Object} [opts.metadata]  - Dữ liệu phụ (campaign, sales_owner, ...)
 */
export async function sendViaOpenClaw({ event, channel, to, message, customer, requestId, metadata }) {
    const webhookUrl = process.env.OPENCLAW_WEBHOOK_URL;
    if (!webhookUrl) return { ok: false, reason: 'OPENCLAW_WEBHOOK_URL not configured' };
    if (!to) return { ok: false, reason: 'Missing recipient (to)' };

    const now = new Date();
    // ISO 8601 with +07:00 offset
    const sendAt = new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().replace('Z', '+07:00');

    const body = {
        event,
        request_id: requestId || `${event}-${to}-${now.toISOString().split('T')[0]}`,
        channel,
        to,
        message,
        send_at: sendAt,
        ...(customer ? { customer } : {}),
        ...(metadata ? { metadata } : {}),
    };

    const headers = { 'Content-Type': 'application/json' };
    if (process.env.OPENCLAW_WEBHOOK_SECRET) {
        headers['X-Webhook-Secret'] = process.env.OPENCLAW_WEBHOOK_SECRET;
    }

    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, data };
    } catch (err) {
        return { ok: false, reason: err.message };
    }
}

/**
 * Gửi đồng thời qua cả Zalo (phone) và Lark (larkId) nếu có
 */
export async function sendBothChannels({ event, phone, larkId, message, customer, requestId, metadata }) {
    const results = [];
    if (phone) {
        results.push(await sendViaOpenClaw({
            event, channel: 'zalo', to: phone, message, customer, metadata,
            requestId: requestId ? `${requestId}-zalo` : undefined,
        }));
    }
    if (larkId) {
        results.push(await sendViaOpenClaw({
            event, channel: 'lark', to: larkId, message, customer, metadata,
            requestId: requestId ? `${requestId}-lark` : undefined,
        }));
    }
    return results;
}
