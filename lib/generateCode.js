import prisma from '@/lib/prisma';

// Models that have soft delete — must check deleted records to avoid code collision
const SOFT_DELETE_MODELS = [
    'customer', 'project', 'product', 'quotation', 'contract',
    'contractor', 'supplier', 'employee', 'workOrder', 'projectExpense',
];

/**
 * Generate next sequential code for a model.
 * Uses Serializable isolation to prevent race conditions in PostgreSQL.
 * Checks both active and soft-deleted records to avoid unique constraint violations.
 *
 * @param {string} model - Prisma model name (e.g., 'customer', 'project')
 * @param {string} prefix - Code prefix (e.g., 'KH', 'DA')
 * @param {number} padLength - Number of digits (default: 3)
 */
export async function generateCode(model, prefix, padLength = 3) {
    return prisma.$transaction(async (tx) => {
        // Get highest code among active records
        const lastActive = await tx[model].findFirst({
            orderBy: { code: 'desc' },
            select: { code: true },
        });

        let nextNum = 1;
        if (lastActive?.code) {
            const parsed = parseInt(lastActive.code.replace(prefix, ''), 10);
            if (!isNaN(parsed) && parsed >= nextNum) nextNum = parsed + 1;
        }

        // For soft-delete models, also check deleted records to avoid unique constraint collision
        if (SOFT_DELETE_MODELS.includes(model)) {
            const lastDeleted = await tx[model].findFirst({
                where: { deletedAt: { not: null } },
                orderBy: { code: 'desc' },
                select: { code: true },
            });
            if (lastDeleted?.code) {
                const parsed = parseInt(lastDeleted.code.replace(prefix, ''), 10);
                if (!isNaN(parsed) && parsed >= nextNum) nextNum = parsed + 1;
            }
        }

        return `${prefix}${String(nextNum).padStart(padLength, '0')}`;
    }, {
        isolationLevel: 'Serializable',
    });
}
