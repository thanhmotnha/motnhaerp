import { z } from 'zod';
import { optStr, optFloat, optDate, updStr, updFloat } from './common';

export const allocationSchema = z.object({
    projectId: z.string().min(1),
    amount: z.number().min(0).default(0),
    ratio: z.number().min(0).max(100).default(0),
    notes: optStr,
});

export const expenseCreateSchema = z.object({
    description: z.string().trim().min(1, 'Mô tả bắt buộc'),
    amount: z.number().min(0, 'Số tiền phải >= 0'),
    projectId: z.string().optional().nullable().default(null).transform(v => v || null),
    expenseType: optStr.default('Dự án'),
    category: optStr.default('Khác'),
    categoryId: z.string().optional().nullable().default(null).transform(v => v || null),
    status: optStr.default('Chờ duyệt'),
    paidAmount: optFloat,
    submittedBy: optStr,
    notes: optStr,
    date: optDate,
    recipientType: optStr,
    recipientId: optStr,
    recipientName: optStr,
    proofUrl: optStr,
    allocations: z.array(allocationSchema).optional().default([]),
}).strict();


export const expenseUpdateSchema = z.object({
    status: updStr,
    approvedBy: updStr,
    paidAmount: updFloat,
    proofUrl: updStr,
    notes: updStr,
    description: updStr,
    amount: updFloat,
    projectId: z.string().optional().nullable().transform(v => v || null),
    expenseType: updStr,
    category: updStr,
    categoryId: z.string().optional().nullable().transform(v => v || null),
    submittedBy: updStr,
    date: optDate,
    recipientType: updStr,
    recipientId: updStr,
    recipientName: updStr,
    allocations: z.array(allocationSchema).optional(),
}).strict();
