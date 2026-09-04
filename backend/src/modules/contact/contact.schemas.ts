import { z } from 'zod';

export const SubmitContactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  category: z.string().min(2).default('General Inquiry'),
  subject: z.string().optional().default(''),
  message: z.string().min(5, 'Message must be at least 5 characters'),
});

export type SubmitContactInput = z.infer<typeof SubmitContactSchema>;
