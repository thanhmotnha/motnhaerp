/**
 * OpenClaw webhook sender
 * ERP → POST https://openclaw.motnha.vn/hooks/agent → OpenClaw AI → Lark / Zalo
 *
 * Env:
 *   OPENCLAW_WEBHOOK_URL    = https://openclaw.motnha.vn/hooks/agent
 *   OPENCLAW_WEBHOOK_SECRET = Bearer token từ OpenClaw
 */

export const isOpenClawConfigured = !!(process.env.OPENCLAW_WEBHOOK_URL && process.env.OPENCLAW_WEBHOOK_SECRET);

/**
 * Gửi tin nhắn qua OpenClaw agent
 * OpenClaw nhận instruction dạng ngôn ngữ tự nhiên trong field "message"
 *
 * @param {Object} opts
 * @param {string} opts.channel    - "lark" | "zalo"
 * @param {string} opts.to         - Tên người nhận hoặc ID (Lark: ou_xxx, Zalo: số điện thoại)
 * @param {string} opts.toName     - Tên hiển thị của người nhận
 * @param {string} opts.content    - Nội dung tin nhắn muốn gửi
 * @param {string} [opts.event]    - Loại sự kiện (để log)
 */
export async function sendViaOpenClaw({ channel, to, toName, content, event }) {
    const webhookUrl = process.env.OPENCLAW_WEBHOOK_URL;
    const secret = process.env.OPENCLAW_WEBHOOK_SECRET;

    if (!webhookUrl || !secret) return { ok: false, reason: 'OpenClaw chưa cấu hình' };
    if (!to || !content) return { ok: false, reason: 'Thiếu người nhận hoặc nội dung' };

    const channelLabel = channel === 'lark' ? 'kênh lark' : 'kênh zalo';
    const recipientLabel = toName ? `${toName} (${to})` : to;

    const message = `Gửi tin nhắn cho ${recipientLabel} qua ${channelLabel}. Nội dung: ${content}`;

    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${secret}`,
            },
            body: JSON.stringify({ message }),
        });
        return { ok: res.ok, status: res.status, event };
    } catch (err) {
        return { ok: false, reason: err.message, event };
    }
}

/**
 * Gửi đồng thời qua cả Zalo và Lark nếu có thông tin
 */
export async function sendBothChannels({ phone, larkId, toName, content, event }) {
    const results = [];
    if (phone) {
        results.push(await sendViaOpenClaw({ channel: 'zalo', to: phone, toName, content, event }));
    }
    if (larkId) {
        results.push(await sendViaOpenClaw({ channel: 'lark', to: larkId, toName, content, event }));
    }
    return results;
}
