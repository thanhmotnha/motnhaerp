import { z } from 'zod';
import { optStr, optFloat } from './common';

const acceptanceCertificateItemSchema = z.object({
    itemName: z.string().trim().min(1, 'Tên hạng mục bắt buộc'),
    quantity: optFloat,
    unit: optStr,
    amount: optFloat,
    notes: optStr,
});

export const acceptanceCertificateCreateSchema = z.object({
    quotationId: z.string().optional().nullable(),
    customerName: optStr,
    items: z.array(acceptanceCertificateItemSchema).min(1, 'Cần ít nhất 1 hạng mục'),
});

export const acceptanceCertificateUpdateSchema = z.object({
    customerName: optStr,
    items: z.array(acceptanceCertificateItemSchema).optional(),
    status: optStr,
});
