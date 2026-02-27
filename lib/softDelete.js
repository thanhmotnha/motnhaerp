/**
 * Prisma middleware for soft delete.
 * Models with `deletedAt` field will be:
 * - Filtered out from findMany/findFirst/findUnique/count (unless explicitly including deleted)
 * - Soft-deleted (set deletedAt) instead of hard-deleted on delete/deleteMany
 */

const SOFT_DELETE_MODELS = [
    'Customer', 'Project', 'Product', 'Quotation', 'Contract',
    'Contractor', 'Supplier', 'Employee', 'WorkOrder', 'ProjectExpense',
];

export function applySoftDelete(prisma) {
    prisma.$use(async (params, next) => {
        if (!SOFT_DELETE_MODELS.includes(params.model)) {
            return next(params);
        }

        // Find operations: filter out soft-deleted
        if (params.action === 'findMany' || params.action === 'findFirst' || params.action === 'count') {
            if (!params.args) params.args = {};
            if (!params.args.where) params.args.where = {};

            // Allow explicit { deletedAt: { not: null } } to find deleted records
            if (params.args.where.deletedAt === undefined) {
                params.args.where.deletedAt = null;
            }
        }

        if (params.action === 'findUnique' || params.action === 'findUniqueOrThrow') {
            // Convert to findFirst to add deletedAt filter
            params.action = 'findFirst';
            if (!params.args) params.args = {};
            const where = params.args.where || {};
            if (where.deletedAt === undefined) {
                params.args.where = { ...where, deletedAt: null };
            }
        }

        // Delete → soft delete
        if (params.action === 'delete') {
            params.action = 'update';
            params.args.data = { deletedAt: new Date() };
        }

        if (params.action === 'deleteMany') {
            params.action = 'updateMany';
            if (!params.args) params.args = {};
            params.args.data = { deletedAt: new Date() };
        }

        return next(params);
    });
}
