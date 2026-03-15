import { z } from 'zod';
import { optStr, optFloat, optDate, safePartial } from './common';

export const employeeCreateSchema = z.object({
    name: z.string().trim().min(1, 'Tên nhân viên bắt buộc'),
    departmentId: z.string().min(1, 'Phòng ban bắt buộc'),
    position: optStr,
    phone: optStr,
    email: optStr,
    salary: optFloat,
    insuranceSalary: optFloat,
    status: optStr.default('Đang làm'),
    joinDate: optDate,
    dateOfBirth: optDate,
    gender: optStr,
    address: optStr,
    idNumber: optStr,
    bankAccount: optStr,
    bankName: optStr,
    emergencyContact: optStr,
    emergencyPhone: optStr,
    leaveBalance: optFloat,
    avatar: optStr,
}).strict();

export const employeeUpdateSchema = safePartial(employeeCreateSchema);
