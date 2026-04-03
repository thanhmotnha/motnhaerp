import { z } from 'zod';

export const officePayrollPatchSchema = z.object({
    actualDays:         z.number().min(0).max(31).optional(),
    positionAllowance:  z.number().min(0).optional(),
    phoneAllowance:     z.number().min(0).optional(),
    transportAllowance: z.number().min(0).optional(),
    diligenceAllowance: z.number().min(0).optional(),
    bonus:              z.number().min(0).optional(),
    disciplinaryFine:   z.number().min(0).optional(),
    salaryAdvance:      z.number().min(0).optional(),
    notes:              z.string().nullable().optional(),
}).strict();
