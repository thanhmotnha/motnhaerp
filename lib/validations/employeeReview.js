import { z } from 'zod';
import { optStr, optFloat, safePartial } from './common';

export const employeeReviewCreateSchema = z.object({
    type: optStr.default('Quý'),
    period: z.string().trim().min(1, 'Kỳ đánh giá bắt buộc'),
    score: optFloat.refine(v => v >= 0 && v <= 5, 'Điểm từ 0-5'),
    content: optStr,
    goals: optStr,
    criteria: z.array(z.any()).optional().default([]),
    strengths: optStr,
    weaknesses: optStr,
    reviewer: optStr,
    status: optStr.default('Nháp'),
}).strict();

export const employeeReviewUpdateSchema = safePartial(employeeReviewCreateSchema);
