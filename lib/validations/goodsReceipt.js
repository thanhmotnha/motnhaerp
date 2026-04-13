import { z } from 'zod';
import { optStr, optFloat, optDate } from './common';

const goodsReceiptItemSchema = z.object({
    productId: z.string().optional().nullable().default(null).transform(v => v || null),
    productName: z.string().trim().min(1),
    unit: optStr,
    qtyOrdered: optFloat,
    qtyReceived: z.number().min(0),
    unitPrice: optFloat,
    variantLabel: optStr,
    purchaseOrderItemId: z.string().optional().nullable().default(null).transform(v => v || null),
});

export const goodsReceiptCreateSchema = z.object({
    purchaseOrderId: z.string().min(1, 'PO bắt buộc'),
    warehouseId: z.string().min(1, 'Kho bắt buộc'),
    receivedDate: optDate,
    receivedBy: optStr,
    notes: optStr,
    items: z.array(goodsReceiptItemSchema).min(1, 'Phải có ít nhất 1 sản phẩm'),
}).strict();
