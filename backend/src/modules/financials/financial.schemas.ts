import { z } from 'zod';

export const updateCommissionConfigSchema = z.object({
  defaultRate: z
    .number({ required_error: 'defaultRate is required' })
    .min(0, 'Commission rate cannot be negative')
    .max(50, 'Commission rate cannot exceed 50%'),
});

export const getFinancialRecordsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).default(20).transform((val) => Math.min(50, val)),
  restaurantId: z.string().optional(),
  status: z.enum(['PENDING', 'SETTLED', 'VOID']).optional(),
});

export type UpdateCommissionConfigInput = z.infer<typeof updateCommissionConfigSchema>;
export type GetFinancialRecordsQueryInput = z.infer<typeof getFinancialRecordsQuerySchema>;
