import { z } from 'zod';
import { optStr, safePartial } from './common';

export const TASK_STATUSES = ['Chưa làm', 'Đang làm', 'Xong', 'Tạm hoãn'];
export const TASK_PRIORITIES = ['Thấp', 'Bình thường', 'Cao', 'Gấp'];

export const workshopTaskCreateSchema = z.object({
    title: z.string().trim().min(1, 'Tên công việc bắt buộc'),
    description: optStr,
    workerId: z.string().min(1, 'Thợ bắt buộc'),
    dueDate: z.string().optional().nullable().transform(v => v ? new Date(v) : new Date()),
    status: z.enum(TASK_STATUSES).default('Chưa làm'),
    priority: z.enum(TASK_PRIORITIES).default('Bình thường'),
    productionBatchId: z.string().optional().nullable().default(null).transform(v => v || null),
    projectId: z.string().optional().nullable().default(null).transform(v => v || null),
    completedPhotos: z.array(z.string()).optional().default([]),
    completedNotes: optStr,
}).strict();

export const workshopTaskUpdateSchema = safePartial(workshopTaskCreateSchema);

export const workshopTaskBulkCreateSchema = z.object({
    workerIds: z.array(z.string()).min(1, 'Chọn ít nhất 1 thợ'),
    title: z.string().trim().min(1),
    description: optStr,
    dueDate: z.string(),
    priority: z.enum(TASK_PRIORITIES).default('Bình thường'),
    productionBatchId: z.string().optional().nullable().default(null).transform(v => v || null),
    projectId: z.string().optional().nullable().default(null).transform(v => v || null),
}).strict();
