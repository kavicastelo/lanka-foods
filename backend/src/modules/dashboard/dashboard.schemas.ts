import { z } from 'zod';

export const getDashboardMetricsQuerySchema = z.object({
  scope: z.enum(['admin', 'restaurant'], {
    required_error: 'scope is required (admin or restaurant)',
  }),
  restaurantId: z.string().optional(),
});

export type GetDashboardMetricsQueryInput = z.infer<typeof getDashboardMetricsQuerySchema>;
