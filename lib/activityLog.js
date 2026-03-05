import prisma from '@/lib/prisma';

/**
 * Log an activity. Fire-and-forget — never throws to avoid breaking the main flow.
 */
export async function logActivity({ actor, action, entityType, entityId, entityLabel = '', diff = null }) {
    try {
        await prisma.activityLog.create({
            data: { actor, action, entityType, entityId, entityLabel, diff },
        });
    } catch {
        // silent — audit log failure must not break the API
    }
}
