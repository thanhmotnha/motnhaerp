import { getSetting } from '@/lib/settingsHelper';

export async function sendZaloLeadNotification({ name, phone, source }) {
    try {
        const token = await getSetting('zaloOaToken');
        const recipientsRaw = await getSetting('zaloRecipients');
        if (!token || !recipientsRaw) return;

        const recipients = recipientsRaw.split(',').map(s => s.trim()).filter(Boolean);

        await Promise.all(recipients.map(userId =>
            fetch('https://openapi.zalo.me/v3.0/oa/message/cs', {
                method: 'POST',
                headers: {
                    'access_token': token,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipient: { user_id: userId },
                    message: {
                        text: `🔔 Lead mới [${source}]\n👤 ${name}\n📞 ${phone}`,
                    },
                }),
            }).catch(e => console.error('[ZaloNotify]', e.message))
        ));
    } catch (e) {
        console.error('[ZaloNotify]', e.message);
    }
}
