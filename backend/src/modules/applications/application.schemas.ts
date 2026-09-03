import { z } from 'zod';

export const submitApplicationSchema = z.object({
  businessName: z.string({ required_error: 'businessName is required' }).min(2, 'Business name must be at least 2 characters'),
  ownerName: z.string({ required_error: 'ownerName is required' }).min(2, 'Owner name must be at least 2 characters'),
  email: z.string({ required_error: 'email is required' }).email('Must be a valid email address'),
  phone: z.string().optional().default(''),
  city: z.string().min(2, 'City must be at least 2 characters').optional().default('Helsinki'),
  address: z.string().optional().default(''),
  businessType: z.string().optional().default('Restaurant'),
  cuisine: z.string().optional().default('Sri Lankan'),
  description: z.string().max(1000).optional().default(''),
  pickup: z.boolean().optional().default(true),
  delivery: z.boolean().optional().default(true),
  logoUrl: z.string().optional().default(''),
  coverUrl: z.string().optional().default(''),
});

export const rejectApplicationSchema = z.object({
  reason: z.string().max(500, 'Rejection reason cannot exceed 500 characters').optional().default(''),
});

export const getApplicationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).default(20).transform((val) => Math.min(50, val)),
  status: z.enum(['pending', 'changes_requested', 'approved', 'rejected']).optional(),
});

export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;
export type RejectApplicationInput = z.infer<typeof rejectApplicationSchema>;
export type GetApplicationsQueryInput = z.infer<typeof getApplicationsQuerySchema>;
