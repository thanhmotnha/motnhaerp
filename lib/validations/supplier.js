import { z } from 'zod';
import { optStr, optInt } from './common';

export const supplierCreateSchema = z.object({
    name: z.string().trim().min(1, 'Tên nhà cung cấp bắt buộc'),
    type: optStr.default('Vật tư xây dựng'),
    contact: optStr,
    phone: optStr,
    email: optStr,
    address: optStr,
    taxCode: optStr,
    bankAccount: optStr,
    bankName: optStr,
    rating: optInt.default(3),
    notes: optStr,
}).strict();

export const supplierUpdateSchema = supplierCreateSchema.partial();
