import { z } from 'zod';

export const restaurantQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).default(20).transform((val) => Math.min(50, val)),
  search: z.string().trim().max(100).optional(),
  city: z.string().trim().max(50).optional(),
  cuisine: z.string().trim().max(50).optional(),
  sortBy: z.enum(['name', 'createdAt', 'minOrder', 'deliveryFee']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const updateRestaurantSettingsSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim().optional(),
  description: z.string().max(1000).trim().optional(),
  phone: z.string().max(30).trim().optional(),
  email: z.string().email().optional(),
  address: z.string().max(200).trim().optional(),
  city: z.string().max(50).trim().optional(),
  prepTime: z.string().max(50).trim().optional(),
  minOrder: z.number().min(0, 'minOrder cannot be negative').optional(),
  deliveryFee: z.number().min(0, 'deliveryFee cannot be negative').optional(),
  pickup: z.boolean().optional(),
  delivery: z.boolean().optional(),
  halal: z.boolean().optional(),
  catering: z.boolean().optional(),
  isOpen: z.boolean().optional(),
  hours: z.string().max(100).trim().optional(),
  timeSlots: z.array(z.string()).optional(),
  cuisines: z.array(z.string()).optional(),
  priceRange: z.enum(['€', '€€', '€€€']).optional(),
  coverImageUrl: z.string().max(500).optional(),
  logoText: z.string().max(50).optional(),
});

export type RestaurantQueryInput = z.infer<typeof restaurantQuerySchema>;
export type UpdateRestaurantSettingsInput = z.infer<typeof updateRestaurantSettingsSchema>;
