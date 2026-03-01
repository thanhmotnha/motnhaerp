import { z } from 'zod';
import { optStr, optFloat, optDate } from './common';

export const expenseCreateSchema = z.object({
    description: z.string().trim().min(1, 'Mô tả bắt buộc'),
    amount: z.number().min(0, 'Số tiền phải >= 0'),
    projectId: z.string().optional().nullable().default(null),
    expenseType: optStr.default('Dự án'),
    category: optStr.default('Khác'),
    status: optStr.default('Chờ duyệt'),
    submittedBy: optStr,
    notes: optStr,
    date: optDate,
    recipientType: optStr,
    recipientId: optStr,
    recipientName: optStr,
}).strict();

export const expenseUpdateSchema = z.object({
    status: optStr,
    approvedBy: optStr,
    paidAmount: optFloat,
    proofUrl: optStr,
    notes: optStr,
}).strict();
