/**
 * OpenClaw webhook sender
 * ERP → POST → OpenClaw → Zalo/Lark
 *
 * Env: OPENCLAW_WEBHOOK_URL — URL endpoint của OpenClaw
 */

export const isOpenClawConfigured = !!process.env.OPENCLAW_WEBHOOK_URL;

/**
 * Send a message via OpenClaw webhook
 * @param {Object} payload
 * @param {string} payload.event - e.g. "customer_birthday", "employee_birthday", "holiday_greeting", "payslip"
 * @param {string} payload.channel - "zalo" | "lark"
 * @param {string} payload.to - phone number (zalo) or Lark user/chat id
 * @param {string} payload.message - message content
 * @param {Object} [payload.customer] - { id, name }
 * @param {string} [payload.requestId] - dedup key (auto-generated if omitted)
 */
export async function sendViaOpenClaw({ event, channel, to, message, customer, requestId }) {
    const webhookUrl = process.env.OPENCLAW_WEBHOOK_URL;
    if (!webhookUrl) return { ok: false, reason: 'OPENCLAW_WEBHOOK_URL not configured' };

    const body = {
        event,
        request_id: requestId || `${event}-${to}-${new Date().toISOString().split('T')[0]}`,
        channel,
        to,
        message,
        ...(customer ? { customer } : {}),
        send_at: new Date().toISOString(),
    };

    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        return { ok: res.ok, status: res.status };
    } catch (err) {
        return { ok: false, reason: err.message };
    }
}

/**
 * Send to both Zalo (by phone) and Lark (by userId) if available
 */
export async function sendBothChannels({ event, phone, larkId, message, customer, requestId }) {
    const results = [];
    if (phone) {
        results.push(await sendViaOpenClaw({ event, channel: 'zalo', to: phone, message, customer, requestId: requestId ? `${requestId}-zalo` : undefined }));
    }
    if (larkId) {
        results.push(await sendViaOpenClaw({ event, channel: 'lark', to: larkId, message, customer, requestId: requestId ? `${requestId}-lark` : undefined }));
    }
    return results;
}
