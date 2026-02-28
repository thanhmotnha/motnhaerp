import { z } from 'zod';
import { optStr, optFloat } from './common';

export const workItemLibrarySchema = z.object({
    name: z.string().trim().min(1, 'Tên hạng mục bắt buộc'),
    category: optStr,
    subcategory: optStr,
    unit: optStr,
    unitPrice: optFloat,
    mainMaterial: optFloat,
    auxMaterial: optFloat,
    labor: optFloat,
    description: optStr,
    image: optStr,
}).strict();

export const workItemLibraryUpdateSchema = workItemLibrarySchema.partial();

export const workItemLibraryBulkSchema = z.array(workItemLibrarySchema);

export const workItemLibraryCategoryRenameSchema = z.object({
    oldCategory: z.string().trim().min(1, 'Danh mục cũ bắt buộc'),
    newCategory: z.string().trim().min(1, 'Danh mục mới bắt buộc'),
}).strict().refine(d => d.oldCategory !== d.newCategory, { message: 'Tên danh mục không thay đổi' });
