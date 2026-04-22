import { getSetting } from '@/lib/settingsHelper';
import prisma from '@/lib/prisma';

/**
 * Send Zalo OA message to a worker about their new task.
 * Requires:
 *  - Setting 'zaloOaToken' (OA access_token)
 *  - User.zaloUserId (worker's Zalo user_id — có được khi họ follow OA và nhắn 1 tin)
 *
 * Docs: https://developers.zalo.me/docs/api/official-account-api/message/api-gui-tin-tu-van-cho-nguoi-quan-tam-v3.0
 *
 * @param {string} taskId
 */
export async function sendTaskNotifyToWorker(taskId) {
    try {
        const task = await prisma.workshopTask.findUnique({
            where: { id: taskId },
            include: {
                worker: { select: { id: true, name: true, zaloUserId: true } },
                assignedBy: { select: { name: true } },
                project: { select: { name: true } },
            },
        });
        if (!task) return { skipped: 'task not found' };
        if (!task.worker?.zaloUserId) return { skipped: 'worker chưa liên kết Zalo' };

        const token = await getSetting('zaloOaToken');
        if (!token) return { skipped: 'chưa cấu hình zaloOaToken' };

        const dueDate = new Date(task.dueDate).toLocaleDateString('vi-VN');
        const priority = task.priority === 'Gấp' ? '🔴 GẤP · ' : task.priority === 'Cao' ? '🟡 Cao · ' : '';
        const lines = [
            `🔨 Việc mới: ${task.title}`,
            `${priority}Deadline: ${dueDate}`,
            task.project?.name ? `📁 ${task.project.name}` : '',
            task.description ? `\n${task.description}` : '',
            `\n👤 Giao bởi: ${task.assignedBy?.name || '—'}`,
            `\nMở app để xem chi tiết.`,
        ].filter(Boolean);

        const res = await fetch('https://openapi.zalo.me/v3.0/oa/message/cs', {
            method: 'POST',
            headers: {
                access_token: token,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                recipient: { user_id: task.worker.zaloUserId },
                message: { text: lines.join('\n') },
            }),
        });
        const json = await res.json().catch(() => ({}));
        if (json.error) {
            console.error('[ZaloTask]', json.error, json.message);
            return { error: json.message };
        }
        return { ok: true };
    } catch (e) {
        console.error('[ZaloTask]', e.message);
        return { error: e.message };
    }
}
