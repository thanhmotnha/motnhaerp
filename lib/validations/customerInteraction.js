import { z } from 'zod';
import { safePartial } from './common';

export const INTERACTION_TYPES = ['Gặp trực tiếp', 'Điện thoại', 'Zalo', 'Email', 'Ghi chú'];
export const INTEREST_LEVELS = ['', 'Nóng', 'Ấm', 'Lạnh'];
export const OUTCOMES = ['', 'Báo giá', 'Đặt cọc', 'Từ chối', 'Cần gặp lại'];

export const interactionCreateSchema = z.object({
    type: z.enum(INTERACTION_TYPES).default('Gặp trực tiếp'),
    content: z.string().trim().min(1, 'Nội dung bắt buộc'),
    date: z.string().optional().nullable().transform(v => v ? new Date(v) : new Date()),
    photos: z.array(z.string().min(1)).max(10, 'Tối đa 10 ảnh').optional().default([]),
    interestLevel: z.enum(INTEREST_LEVELS).optional().default(''),
    outcome: z.enum(OUTCOMES).optional().default(''),
    companionIds: z.array(z.string().cuid()).optional().default([]),
}).strict();

export const interactionUpdateSchema = safePartial(interactionCreateSchema);
