import { z } from 'zod';
import { optStr, optFloat, optInt } from './common';

const templateItemSchema = z.object({
    name: z.string().trim().min(1, 'Tên hạng mục bắt buộc'),
    order: optInt,
    level: optInt,
    wbs: optStr,
    duration: z.number().int().min(1).optional().default(1),
    weight: z.number().min(0).optional().default(1),
    color: optStr,
    parentIndex: z.number().int().optional().nullable().default(null), // index ref within array
    predecessorIndex: z.number().int().optional().nullable().default(null),
});

export const scheduleTemplateCreateSchema = z.object({
    name: z.string().trim().min(1, 'Tên mẫu bắt buộc'),
    type: optStr.default('Nội thất'),
    description: optStr,
    items: z.array(templateItemSchema).optional().default([]),
});

export const scheduleTemplateUpdateSchema = z.object({
    name: z.string().trim().optional(),
    type: z.string().optional(),
    description: z.string().optional(),
    items: z.array(templateItemSchema).optional(),
});
