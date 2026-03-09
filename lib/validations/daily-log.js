import { z } from 'zod';
import { optStr } from './common';

export const dailyLogCreateSchema = z.object({
    projectId: z.string().min(1, 'Dự án bắt buộc'),
    date: z.string().optional(),
    weather: optStr.default('Nắng'),
    workforce: z.number().int().min(0).optional().default(0),
    workDone: z.string().trim().min(1, 'Nội dung công việc bắt buộc'),
    issues: optStr,
}).strict();
