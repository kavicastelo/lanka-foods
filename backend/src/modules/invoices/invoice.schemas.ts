import { z } from 'zod';

export const generateInvoiceSchema = z.object({
  restaurantId: z.string().min(1, 'Restaurant ID is required'),
  periodStart: z.string().min(1, 'Period start date is required'),
  periodEnd: z.string().min(1, 'Period end date is required'),
  subscriptionFee: z.number().min(0).optional().default(0),
  notes: z.string().optional(),
});

export const uploadPaymentSlipSchema = z.object({
  paymentSlipUrl: z.string().min(1, 'Payment slip URL is required'),
});

export const listInvoicesQuerySchema = z.object({
  restaurantId: z.string().optional(),
  status: z.enum(['DRAFT', 'ISSUED', 'PAID', 'CANCELLED']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>;
export type UploadPaymentSlipInput = z.infer<typeof uploadPaymentSlipSchema>;
export type ListInvoicesQueryInput = z.infer<typeof listInvoicesQuerySchema>;
