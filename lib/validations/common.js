import { z } from 'zod';

export const str = z.string().trim();
export const optStr = z.string().trim().optional().default('');
export const optFloat = z.number().optional().default(0);
export const optInt = z.number().int().optional().default(0);
export const optDate = z.string().datetime({ offset: true }).optional().nullable().transform(v => v ? new Date(v) : null)
    .or(z.string().optional().nullable().transform(v => {
        if (!v) return null;
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
    }));
export const cuid = z.string().cuid().optional().nullable();

// "Update" variants — same type but NO .default(), so missing fields stay undefined (not sent to Prisma)
export const updStr = z.string().trim().optional();
export const updFloat = z.number().optional();
export const updInt = z.number().int().optional();

/**
 * Creates a safe partial update schema from a create schema.
 * Strips all .default() values so missing fields don't get injected into Prisma updates.
 * Usage: export const fooUpdateSchema = safePartial(fooCreateSchema);
 */
export function safePartial(schema) {
    const shape = schema.shape;
    const newShape = {};
    for (const [key, field] of Object.entries(shape)) {
        // Remove .default() by unwrapping ZodDefault
        let f = field;
        while (f._def?.typeName === 'ZodDefault') {
            f = f._def.innerType;
        }
        // Make optional if not already
        if (f._def?.typeName !== 'ZodOptional') {
            f = f.optional();
        }
        newShape[key] = f;
    }
    return z.object(newShape);
}
