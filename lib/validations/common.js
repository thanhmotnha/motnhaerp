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
 * Creates a safe update "schema" from a create schema.
 * Returns an object with .parse() that validates then strips
 * any keys NOT in the original input (prevents .default() injection).
 * 
 * Compatible with: const data = schema.parse(body);
 */
export function safePartial(createSchema) {
    const partial = createSchema.partial();
    const doParse = (body) => {
        const parsed = partial.parse(body);
        const inputKeys = new Set(Object.keys(body || {}));
        const result = {};
        for (const key of Object.keys(parsed)) {
            if (inputKeys.has(key)) {
                result[key] = parsed[key];
            }
        }
        return result;
    };
    return {
        parse: doParse,
        safeParse(body) {
            try {
                return { success: true, data: doParse(body) };
            } catch (err) {
                return { success: false, error: err };
            }
        },
        // Also support passthrough for contract schema
        passthrough() {
            return {
                parse(body) {
                    const parsed = partial.parse(body);
                    const inputKeys = new Set(Object.keys(body || {}));
                    const result = {};
                    for (const key of Object.keys(parsed)) {
                        if (inputKeys.has(key)) result[key] = body[key] !== undefined ? parsed[key] : undefined;
                    }
                    // Passthrough: also include unknown keys from body
                    for (const key of Object.keys(body || {})) {
                        if (!(key in result)) result[key] = body[key];
                    }
                    return result;
                }
            };
        }
    };
}
