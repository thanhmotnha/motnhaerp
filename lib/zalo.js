/**
 * Zalo Official Account (OA) notification utility
 * Docs: https://developers.zalo.me/docs/official-account/tin-nhan/gui-tin-nhan-van-ban
 */

import prisma from './prisma';
import { getSetting, setSetting } from './settingsHelper';

const ZALO_OA_API = 'https://openapi.zalo.me/v3.0/oa/message/cs';

/**
 * Lấy access token: ưu tiên DB (setting `zaloOaToken`), fallback env `ZALO_OA_ACCESS_TOKEN`
 */
async function getAccessToken() {
    try {
        const value = await getSetting('zaloOaToken');
        if (value) return value;
    } catch {}
    return process.env.ZALO_OA_ACCESS_TOKEN || null;
}

/**
 * Lưu tokens Zalo vào DB
 * - Access token dùng key `zaloOaToken` (thống nhất với UI Settings + lib/zaloNotify.js)
 * - Refresh token + expires vẫn giữ key cũ (chỉ nội bộ lib/zalo.js dùng)
 */
export async function saveZaloTokens({ accessToken, refreshToken, expiresAt }) {
    const ops = [];
    if (accessToken) {
        ops.push(setSetting('zaloOaToken', accessToken));
    }
    if (refreshToken) {
        ops.push(prisma.systemSetting.upsert({
            where: { key: 'ZALO_OA_REFRESH_TOKEN' },
            update: { value: refreshToken },
            create: { key: 'ZALO_OA_REFRESH_TOKEN', value: refreshToken },
        }));
    }
    if (expiresAt) {
        ops.push(prisma.systemSetting.upsert({
            where: { key: 'ZALO_OA_EXPIRES_AT' },
            update: { value: expiresAt },
            create: { key: 'ZALO_OA_EXPIRES_AT', value: expiresAt },
        }));
    }
    await Promise.all(ops);
}

/**
 * Lấy trạng thái kết nối Zalo OA từ DB
 */
export async function getZaloStatus() {
    try {
        const [tokenSetting, expiresSetting] = await Promise.all([
            prisma.systemSetting.findUnique({ where: { key: 'zaloOaToken' } }),
            prisma.systemSetting.findUnique({ where: { key: 'ZALO_OA_EXPIRES_AT' } }),
        ]);
        return {
            connected: !!tokenSetting?.value,
            expiresAt: expiresSetting?.value || null,
            updatedAt: tokenSetting?.updatedAt || null,
        };
    } catch {
        return { connected: !!process.env.ZALO_OA_ACCESS_TOKEN, expiresAt: null, updatedAt: null };
    }
}

/**
 * Gửi tin nhắn văn bản đến một follower của OA
 */
export async function sendZaloMessage(zaloUserId, text) {
    const accessToken = await getAccessToken();
    if (!accessToken) {
        console.warn('[Zalo] zaloOaToken chưa được cấu hình');
        return { success: false, error: 'Chưa cấu hình Zalo OA token' };
    }
    if (!zaloUserId) {
        return { success: false, error: 'Thiếu Zalo User ID' };
    }

    try {
        const res = await fetch(ZALO_OA_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'access_token': accessToken,
            },
            body: JSON.stringify({
                recipient: { user_id: zaloUserId },
                message: { text },
            }),
        });

        const data = await res.json();
        if (data.error !== 0) {
            console.error('[Zalo] Lỗi gửi tin:', data);
            return { success: false, error: data.message };
        }
        return { success: true };
    } catch (err) {
        console.error('[Zalo] Exception:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Gửi tin nhắn đến nhiều người cùng lúc
 */
export async function sendZaloBatch(messages) {
    const results = await Promise.allSettled(
        messages.map(({ zaloUserId, text }) => sendZaloMessage(zaloUserId, text))
    );
    return results;
}
