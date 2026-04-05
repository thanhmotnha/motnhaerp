import { z } from 'zod';
import { optStr, optFloat, optDate } from './common';

const stockIssueItemSchema = z.object({
    productId: z.string().optional().nullable().default(null).transform(v => v || null),
    productName: z.string().trim().min(1),
    unit: optStr,
    qty: z.number().min(0.001, 'Số lượng phải > 0'),
    unitPrice: optFloat,
});

export const stockIssueCreateSchema = z.object({
    warehouseId: z.string().min(1, 'Kho bắt buộc'),
    projectId: z.string().optional().nullable().default(null).transform(v => v || null),
    issuedDate: optDate,
    issuedBy: optStr,
    notes: optStr,
    items: z.array(stockIssueItemSchema).min(1, 'Phải có ít nhất 1 sản phẩm'),
}).strict();
