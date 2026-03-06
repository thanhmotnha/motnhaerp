import prisma from '@/lib/prisma';

/**
 * Log an activity to the ActivityLog table.
 * Usage: await logActivity({ action: 'create', entityType: 'Project', entityId: p.id, entityLabel: `${p.code} ${p.name}`, actor: session.user.name, actorId: session.user.id });
 */
export async function logActivity({
    action,
    entityType,
    entityId,
    entityLabel = '',
    actor = 'System',
    actorId = '',
    diff = null,
    metadata = null,
    ipAddress = '',
}) {
    try {
        await prisma.activityLog.create({
            data: {
                action,
                entityType,
                entityId,
                entityLabel,
                actor,
                actorId,
                diff: diff || undefined,
                metadata: metadata || undefined,
                ipAddress,
            },
        });
    } catch (e) {
        // Don't let logging errors break the main flow
        console.error('[ActivityLog] Failed to log:', e.message);
    }
}

/**
 * Helper to compute diff between old and new objects
 */
export function computeDiff(oldObj, newObj, fields) {
    const diff = {};
    for (const field of fields) {
        const oldVal = oldObj?.[field];
        const newVal = newObj?.[field];
        if (oldVal !== newVal) {
            diff[field] = { old: oldVal, new: newVal };
        }
    }
    return Object.keys(diff).length > 0 ? diff : null;
}
