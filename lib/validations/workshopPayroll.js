// lib/validations/workshopPayroll.js
import { z } from 'zod';

export const workshopPayrollPatchSchema = z.object({
    overtimeHours:      z.number().min(0).optional(),
    mealAllowance:      z.number().min(0).optional(),
    phoneAllowance:     z.number().min(0).optional(),
    transportAllowance: z.number().min(0).optional(),
    diligenceAllowance: z.number().min(0).optional(),
    bonus:              z.number().min(0).optional(),
    disciplinaryFine:   z.number().min(0).optional(),
    salaryAdvance:      z.number().min(0).optional(),
    actualDays:         z.number().min(0).optional(),
    notes:              z.string().optional(),
}).strict();
