import { z } from 'zod';

// ============ Validation Schemas ============

export const projectExpenseSchema = z.object({
    description: z.string().min(1, 'Chưa nhập mô tả'),
    amount: z.number().positive('Số tiền phải > 0'),
    category: z.string().optional().default('Khác'),
    projectId: z.string().cuid('ID dự án không hợp lệ').optional().nullable(),
    date: z.string().datetime().optional(),
    recipientType: z.string().optional(),
    recipientId: z.string().optional(),
    recipientName: z.string().optional(),
    notes: z.string().optional(),
    proofUrl: z.string().url().optional().or(z.literal('')),
});

export const purchaseOrderSchema = z.object({
    supplier: z.string().min(1, 'Chưa chọn nhà cung cấp'),
    projectId: z.string().cuid().optional().nullable(),
    supplierId: z.string().cuid().optional().nullable(),
    deliveryType: z.string().optional(),
    deliveryAddress: z.string().optional(),
    deliveryDate: z.string().datetime().optional().nullable(),
    notes: z.string().optional(),
    items: z.array(z.object({
        productName: z.string().min(1),
        unit: z.string().optional(),
        quantity: z.number().positive(),
        unitPrice: z.number().min(0),
        productId: z.string().optional().nullable(),
        materialPlanId: z.string().optional().nullable(),
    })).min(1, 'Cần ít nhất 1 mục'),
});

export const contractSchema = z.object({
    name: z.string().min(1, 'Chưa nhập tên hợp đồng'),
    type: z.string().optional(),
    contractValue: z.number().positive('Giá trị HĐ phải > 0'),
    customerId: z.string().cuid('Chưa chọn khách hàng'),
    projectId: z.string().cuid('Chưa chọn dự án'),
    quotationId: z.string().cuid().optional().nullable(),
    signDate: z.string().datetime().optional().nullable(),
    startDate: z.string().datetime().optional().nullable(),
    endDate: z.string().datetime().optional().nullable(),
    paymentTerms: z.string().optional(),
    notes: z.string().optional(),
});

export const workOrderSchema = z.object({
    title: z.string().min(1, 'Chưa nhập tên công việc'),
    projectId: z.string().cuid('Chưa chọn dự án'),
    priority: z.enum(['Thấp', 'Trung bình', 'Cao', 'Khẩn cấp']).optional(),
    assignee: z.string().optional(),
    dueDate: z.string().datetime().optional().nullable(),
    description: z.string().optional(),
    category: z.string().optional(),
    scheduleTaskId: z.string().cuid().optional().nullable(),
});

export const acceptanceSchema = z.object({
    projectId: z.string().cuid('Chưa chọn dự án'),
    milestoneId: z.string().cuid().optional().nullable(),
    title: z.string().min(1, 'Chưa nhập tiêu đề'),
    items: z.array(z.object({
        name: z.string().min(1),
        status: z.enum(['pass', 'fail', 'na']),
        note: z.string().optional(),
    })).optional(),
    inspector: z.string().optional(),
    customerRep: z.string().optional(),
    notes: z.string().optional(),
});

export const dailyLogSchema = z.object({
    projectId: z.string().cuid('Chưa chọn dự án'),
    weather: z.string().optional(),
    workforce: z.string().optional(),
    workDone: z.string().min(1, 'Chưa nhập nội dung công việc'),
    issues: z.string().optional(),
    tomorrowPlan: z.string().optional(),
    date: z.string().datetime().optional(),
});

/**
 * Validate request body with Zod schema
 * Usage: const data = await validateBody(request, mySchema);
 */
export async function validateBody(request, schema) {
    const body = await request.json();
    return schema.parse(body);
}
