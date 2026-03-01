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
