import prisma from '@/lib/prisma';

/**
 * Generate next sequential code for a model.
 * Uses Serializable isolation to prevent race conditions in PostgreSQL.
 *
 * @param {string} model - Prisma model name (e.g., 'customer', 'project')
 * @param {string} prefix - Code prefix (e.g., 'KH', 'DA')
 * @param {number} padLength - Number of digits (default: 3)
 */
export async function generateCode(model, prefix, padLength = 3) {
    return prisma.$transaction(async (tx) => {
        const last = await tx[model].findFirst({
            orderBy: { createdAt: 'desc' },
            select: { code: true },
        });

        let nextNum = 1;
        if (last?.code) {
            const numPart = last.code.replace(prefix, '');
            const parsed = parseInt(numPart, 10);
            if (!isNaN(parsed)) nextNum = parsed + 1;
        }

        // Ensure uniqueness
        let code = `${prefix}${String(nextNum).padStart(padLength, '0')}`;
        while (await tx[model].findUnique({ where: { code } })) {
            nextNum++;
            code = `${prefix}${String(nextNum).padStart(padLength, '0')}`;
        }

        return code;
    }, {
        isolationLevel: 'Serializable',
    });
}
