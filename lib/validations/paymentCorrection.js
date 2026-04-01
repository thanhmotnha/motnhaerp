import { z } from 'zod';

export const correctionCreateSchema = z.object({
    contractPaymentId: z.string().min(1),
    contractId: z.string().min(1),
    newAmount: z.number().positive('Số tiền phải lớn hơn 0'),
    reason: z.string().trim().min(5, 'Lý do tối thiểu 5 ký tự').max(1000),
}).strict();

export const correctionReviewSchema = z.object({
    action: z.enum(['approved', 'rejected']),
    rejectionNote: z.string().trim().max(500).optional().default(''),
}).strict();
