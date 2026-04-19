import { z } from 'zod';
import { optStr } from './common';

export const stockTakingCreateSchema = z.object({
    warehouseId: z.string().min(1, 'Kho bắt buộc'),
    note: optStr,
    productIds: z.array(z.string()).optional().nullable().default(null),
}).strict();

const stockTakingItemUpdateSchema = z.object({
    id: z.string().min(1),
    countedStock: z.number().int().nullable().optional(),
    note: optStr,
}).strict();

export const stockTakingUpdateSchema = z.object({
    note: optStr.optional(),
    items: z.array(stockTakingItemUpdateSchema).optional(),
}).strict();
