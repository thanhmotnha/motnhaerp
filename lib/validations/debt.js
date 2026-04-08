import { z } from 'zod';
import { optStr, optDate } from './common';

export const supplierDebtCreateSchema = z.object({
    supplierId: z.string().min(1, 'supplierId bắt buộc'),
    projectId: z.string().optional().nullable().default(null).transform(v => v || null),
    invoiceNo: optStr,
    description: z.string().trim().min(1, 'Mô tả bắt buộc'),
    totalAmount: z.number().min(0, 'Số tiền phải >= 0'),
    date: optDate,
    proofUrl: optStr,
    notes: optStr,
}).strict();

export const supplierDebtUpdateSchema = z.object({
    invoiceNo: optStr,
    description: z.string().trim().min(1).optional(),
    notes: optStr,
    proofUrl: optStr,
}).strict();

export const debtPaymentSchema = z.object({
    amount: z.number().min(1, 'Số tiền phải > 0'),
    date: optDate,
    notes: optStr,
    proofUrl: optStr,
    expenseId: z.string().optional().nullable().default(null).transform(v => v || null),
    paymentAccount: z.string().optional().default(''),
}).strict();

export const contractorDebtCreateSchema = z.object({
    contractorId: z.string().min(1, 'contractorId bắt buộc'),
    projectId: z.string().min(1, 'projectId bắt buộc'),
    description: z.string().trim().min(1, 'Mô tả bắt buộc'),
    totalAmount: z.number().min(0, 'Số tiền phải >= 0'),
    date: optDate,
    proofUrl: optStr,
    notes: optStr,
}).strict();

export const contractorDebtUpdateSchema = z.object({
    description: z.string().trim().min(1).optional(),
    notes: optStr,
    proofUrl: optStr,
}).strict();
