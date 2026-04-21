/**
 * Expo Push Notification helper — server side.
 * Sends push via Expo's public HTTP endpoint.
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

import prisma from '@/lib/prisma';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send push notification to a list of Expo push tokens.
 * @param {string[]} tokens - Array of Expo push tokens (starts with "ExponentPushToken[...]")
 * @param {{ title: string, body: string, data?: any }} payload
 */
export async function sendPushToTokens(tokens, payload) {
    const valid = (tokens || []).filter(t => t && t.startsWith('ExponentPushToken'));
    if (valid.length === 0) return;

    const messages = valid.map(token => ({
        to: token,
        sound: 'default',
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
    }));

    try {
        const r = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
        });
        if (!r.ok) {
            console.error('[push] failed', r.status, await r.text().catch(() => ''));
        }
    } catch (e) {
        console.error('[push] network error', e?.message);
    }
}

/**
 * Send push to users by role(s).
 */
export async function sendPushToRoles(roles, payload) {
    if (!Array.isArray(roles)) roles = [roles];
    const users = await prisma.user.findMany({
        where: { role: { in: roles }, active: true, pushToken: { not: '' } },
        select: { pushToken: true },
    });
    await sendPushToTokens(users.map(u => u.pushToken), payload);
}

/**
 * Send push to a single user by id.
 */
export async function sendPushToUser(userId, payload) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { pushToken: true },
    });
    if (!user?.pushToken) return;
    await sendPushToTokens([user.pushToken], payload);
}
