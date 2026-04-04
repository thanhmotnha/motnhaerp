import { z } from 'zod';
import { optStr, optFloat, optInt, optDate, safePartial } from './common';

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
    payrollType:        z.enum(['office', 'workshop']).optional().default('office'),
    positionAllowance:  optInt,
    phoneAllowance:     optInt,
    transportAllowance: optInt,
    diligenceAllowance: optInt,
    mealAllowanceRate:  optInt,
    dailyWage:          optInt,
    larkId:             optStr,
}).strict();

export const employeeUpdateSchema = safePartial(employeeCreateSchema);
