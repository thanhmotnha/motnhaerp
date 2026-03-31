import prisma from '@/lib/prisma';
import { withCodeRetry } from '@/lib/generateCode';
import { sendZaloLeadNotification } from '@/lib/zaloNotify';

/**
 * Core lead processing logic.
 * @param {object} params
 * @param {string} params.name
 * @param {string} params.phone
 * @param {string} [params.email]
 * @param {string} params.source  — e.g. 'Website', 'Facebook Lead Ads'
 * @param {string} [params.notes]
 * @param {string} [params.utmCampaign]
 * @param {string} [params.facebookLeadId]
 * @returns {Promise<{ customerId: string, created: boolean }>}
 */
export async function processLead({
    name,
    phone,
    email = '',
    source,
    notes = '',
    utmCampaign = '',
    facebookLeadId = '',
}) {
    // 1. Deduplicate by facebookLeadId (prevent duplicate FB webhooks)
    if (facebookLeadId) {
        const existing = await prisma.customer.findFirst({
            where: { facebookLeadId, deletedAt: null },
            select: { id: true },
        });
        if (existing) return { customerId: existing.id, created: false };
    }

    // 2. Deduplicate by phone
    const byPhone = await prisma.customer.findFirst({
        where: { phone, deletedAt: null },
        select: { id: true, code: true },
    });
    if (byPhone) {
        await prisma.trackingLog.create({
            data: {
                customerId: byPhone.id,
                content: `Lead trùng từ ${source}${notes ? ': ' + notes : ''}${utmCampaign ? ' [' + utmCampaign + ']' : ''}`,
                type: 'Ghi chú',
                createdBy: 'system',
            },
        });
        return { customerId: byPhone.id, created: false };
    }

    // 3. Create new customer
    const customer = await withCodeRetry('customer', 'KH-', async (code) => {
        return prisma.customer.create({
            data: {
                code,
                name,
                phone,
                email,
                source,
                notes: notes + (utmCampaign ? ` [${utmCampaign}]` : ''),
                pipelineStage: 'Lead',
                status: 'Lead',
                facebookLeadId,
            },
        });
    });

    // 4. Create in-app notification (uses existing Notification model)
    await prisma.notification.create({
        data: {
            type: 'info',
            icon: '🔔',
            title: `Lead mới từ ${source}`,
            message: `${name} · ${phone}`,
            link: `/customers/${customer.code}`,
            source: 'lead_intake',
        },
    });

    // 5. Zalo OA — fire-and-forget, never blocks response
    sendZaloLeadNotification({ name, phone, source }).catch(() => {});

    return { customerId: customer.id, created: true };
}
