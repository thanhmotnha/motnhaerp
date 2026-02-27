import prisma from '@/lib/prisma';

/**
 * Generate next sequential code for a model.
 * Instead of using count() (fails after deletes), finds the max existing code
 * and increments it. Falls back to prefix + "001" if no records exist.
 * 
 * @param {string} model - Prisma model name (e.g., 'customer', 'project')
 * @param {string} prefix - Code prefix (e.g., 'KH', 'DA')
 * @param {number} padLength - Number of digits (default: 3)
 */
export async function generateCode(model, prefix, padLength = 3) {
    const last = await prisma[model].findFirst({
        orderBy: { createdAt: 'desc' },
        select: { code: true },
    });

    let nextNum = 1;
    if (last?.code) {
        const numPart = last.code.replace(prefix, '');
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed)) nextNum = parsed + 1;
    }

    // Ensure uniqueness by also checking if this code exists
    let code = `${prefix}${String(nextNum).padStart(padLength, '0')}`;
    while (await prisma[model].findUnique({ where: { code } })) {
        nextNum++;
        code = `${prefix}${String(nextNum).padStart(padLength, '0')}`;
    }

    return code;
}
