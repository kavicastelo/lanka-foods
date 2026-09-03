import { z } from 'zod';

export const createMenuCategorySchema = z.object({
  name: z.string({ required_error: 'Menu category name is required' }).min(2, 'Name must be at least 2 characters').max(100).trim(),
  sortOrder: z.number().int('sortOrder must be an integer').default(0),
});

export const updateMenuCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim().optional(),
  sortOrder: z.number().int('sortOrder must be an integer').optional(),
});

export const createMenuItemSchema = z.object({
  categoryId: z.string({ required_error: 'Category ID is required' }).min(1, 'Category ID is required'),
  name: z.string({ required_error: 'Menu item name is required' }).min(2, 'Name must be at least 2 characters').max(100).trim(),
  description: z.string().max(1000).trim().optional().default(''),
  price: z
    .number({ required_error: 'Price is required' })
    .int('Price must be an integer in cents')
    .min(0, 'Price cannot be negative'),
  imageUrl: z.string().max(500).optional().default(''),
  isVegetarian: z.boolean().optional().default(false),
  isAvailable: z.boolean().optional().default(true),
  isPopular: z.boolean().optional().default(false),
  sortOrder: z.number().int().optional().default(0),
});

export const updateMenuItemSchema = z.object({
  categoryId: z.string().min(1).optional(),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim().optional(),
  description: z.string().max(1000).trim().optional(),
  price: z.number().int('Price must be an integer in cents').min(0, 'Price cannot be negative').optional(),
  imageUrl: z.string().max(500).optional(),
  isVegetarian: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export type CreateMenuCategoryInput = z.infer<typeof createMenuCategorySchema>;
export type UpdateMenuCategoryInput = z.infer<typeof updateMenuCategorySchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
