import { z } from 'zod';
import { optStr, safePartial } from './common';

// Updated sau khi schema WorkshopTask drop: workerId, assignedById, dueDate, productionBatchId,
// completedPhotos, completedNotes, completedAt. Schema mới dùng many-to-many workers + materials.
export const TASK_STATUSES = ['Chờ làm', 'Đang làm', 'Hoàn thành', 'Tạm dừng'];
export const TASK_PRIORITIES = ['Thấp', 'Trung bình', 'Cao', 'Gấp'];

const materialItemSchema = z.object({
    productId: z.string().min(1),
    quantity: z.number().positive().default(1),
}).strict();

export const workshopTaskCreateSchema = z.object({
    title: z.string().trim().min(1, 'Tên công việc bắt buộc'),
    description: optStr,
    projectId: z.string().optional().nullable().default(null).transform(v => v || null),
    startDate: z.string().optional().nullable().transform(v => v ? new Date(v) : null),
    deadline: z.string().optional().nullable().transform(v => v ? new Date(v) : null),
    status: z.enum(TASK_STATUSES).default('Chờ làm'),
    priority: z.enum(TASK_PRIORITIES).default('Trung bình'),
    category: z.string().trim().optional().default('Lắp ghép tại xưởng'),
    progress: z.number().int().min(0).max(100).optional().default(0),
    notes: optStr,
    workerIds: z.array(z.string().min(1)).optional().default([]),
    materials: z.array(materialItemSchema).optional().default([]),
}).strict();

export const workshopTaskUpdateSchema = safePartial(workshopTaskCreateSchema);
