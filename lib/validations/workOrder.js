import { z } from 'zod';
import { optStr, optDate } from './common';

export const workOrderCreateSchema = z.object({
    title: z.string().trim().min(1, 'Tiêu đề bắt buộc'),
    projectId: z.string().min(1, 'Dự án bắt buộc'),
    description: optStr,
    priority: optStr.default('Trung bình'),
    status: optStr.default('Chờ xử lý'),
    assignee: optStr,
    dueDate: optDate,
    category: optStr,
}).strict();

export const workOrderUpdateSchema = workOrderCreateSchema.partial();
