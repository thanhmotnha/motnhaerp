import { z } from 'zod';
import { optStr, optFloat, optDate, safePartial } from './common';

export const contractCreateSchema = z.object({
    name: z.string().trim().min(1, 'Tên hợp đồng bắt buộc').max(500),
    customerId: z.string().min(1, 'Khách hàng bắt buộc'),
    projectId: z.string().optional().nullable().default(null),
    type: optStr.default('Thi công thô'),
    contractValue: optFloat,
    variationAmount: optFloat,
    status: optStr,
    signDate: optDate,
    startDate: optDate,
    endDate: optDate,
    paymentTerms: optStr,
    notes: z.string().trim().max(5000).optional().default(''),
    fileUrl: optStr,
    quotationId: z.string().optional().nullable().default(null),
    contractBody: z.string().optional().default(''),
    selectedItems: z.string().optional().default('[]'),
    templateId: z.string().optional().default(''),
    paymentPhases: z.array(z.object({
        phase: z.string().max(200),
        amount: z.number().default(0),
        pct: z.number().optional(),
        category: z.string().optional(),
        dueDate: optDate,
    })).optional(),
}).strict();

export const contractUpdateSchema = safePartial(contractCreateSchema);
