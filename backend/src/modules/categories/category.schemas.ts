import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string({ required_error: 'Category name is required' }).min(2).trim(),
  slug: z
    .string({ required_error: 'Category slug is required' })
    .min(2)
    .trim()
    .transform((val) => val.toLowerCase()),
  imageUrl: z.string().optional().default(''),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).trim().optional(),
  slug: z
    .string()
    .min(2)
    .trim()
    .transform((val) => val.toLowerCase())
    .optional(),
  imageUrl: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
