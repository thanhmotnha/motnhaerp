import { z } from 'zod';
import { optStr, optFloat } from './common';

const furnitureMaterialOrderItemSchema = z.object({
    name: z.string().trim().min(1, 'Tên vật liệu bắt buộc'),
    colorCode: optStr,
    imageUrl: optStr,
    thickness: z.number().optional().nullable(),
    quantity: optFloat,
    unit: optStr,
    unitPrice: optFloat,
    notes: optStr,
});

export const furnitureMaterialOrderUpdateSchema = z.object({
    items: z.array(furnitureMaterialOrderItemSchema),
});
