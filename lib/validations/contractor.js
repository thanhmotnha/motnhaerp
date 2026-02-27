import { z } from 'zod';
import { optStr, optInt } from './common';

export const contractorCreateSchema = z.object({
    name: z.string().trim().min(1, 'Tên thầu phụ bắt buộc'),
    type: z.string().trim().min(1, 'Loại bắt buộc'),
    phone: optStr,
    address: optStr,
    taxCode: optStr,
    bankAccount: optStr,
    bankName: optStr,
    rating: optInt.default(3),
    notes: optStr,
}).strict();

export const contractorUpdateSchema = contractorCreateSchema.partial();
