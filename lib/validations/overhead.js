import { z } from 'zod';
import { optStr, optFloat, optDate } from './common';

export const overheadExpenseCreateSchema = z.object({
    categoryId: z.string().optional().nullable().default(null).transform(v => v || null),
    description: z.string().trim().min(1, 'Mô tả bắt buộc'),
    amount: z.number().min(0, 'Số tiền phải >= 0'),
    date: optDate,
    proofUrl: optStr,
    notes: optStr,
}).strict();

export const overheadExpenseUpdateSchema = z.object({
    categoryId: z.string().optional().nullable().transform(v => v || null),
    description: z.string().trim().min(1).optional(),
    amount: z.number().min(0).optional(),
    date: optDate,
    proofUrl: optStr,
    notes: optStr,
    status: optStr,
    approvedBy: optStr,
    approvedAt: optDate,
}).strict();

const allocationInputSchema = z.object({
    projectId: z.string().min(1),
    ratio: z.number().min(0).max(100),
    amount: z.number().min(0),
    isOverride: z.boolean().default(false),
    notes: optStr,
});

export const overheadBatchCreateSchema = z.object({
    name: z.string().trim().min(1, 'Tên đợt bắt buộc'),
    period: optStr,
    notes: optStr,
    expenseIds: z.array(z.string()).min(1, 'Chọn ít nhất 1 khoản chi phí'),
}).strict();

export const overheadBatchUpdateSchema = z.object({
    name: z.string().trim().min(1).optional(),
    notes: optStr,
    expenseIds: z.array(z.string()).optional(),
}).strict();

export const overheadBatchConfirmSchema = z.object({
    allocations: z.array(allocationInputSchema).min(1, 'Cần có phân bổ cho ít nhất 1 dự án'),
}).strict();
