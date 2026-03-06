import { z } from 'zod';
import { optStr, optFloat, optDate, safePartial } from './common';

export const contractCreateSchema = z.object({
    name: z.string().trim().min(1, 'Tên hợp đồng bắt buộc'),
    customerId: z.string().min(1, 'Khách hàng bắt buộc'),
    projectId: z.string().optional().nullable().default(null),
    type: optStr.default('Thi công thô'),
    contractValue: optFloat,
    variationAmount: optFloat,
    status: optStr.default('Nháp'),
    signDate: optDate,
    startDate: optDate,
    endDate: optDate,
    paymentTerms: optStr,
    notes: optStr,
    fileUrl: optStr,
    quotationId: z.string().optional().nullable().default(null),
    paymentPhases: z.array(z.object({
        phase: z.string(),
        amount: z.number().default(0),
        pct: z.number().optional(),
        category: z.string().optional(),
        dueDate: optDate,
    })).optional(),
}).passthrough();

export const contractUpdateSchema = safePartial(contractCreateSchema).passthrough();
