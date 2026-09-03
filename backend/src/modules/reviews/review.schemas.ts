import { z } from 'zod';

export const createReviewSchema = z.object({
  orderId: z.string({ required_error: 'orderId is required' }).min(1, 'orderId is required'),
  rating: z
    .number({ required_error: 'rating is required' })
    .int('rating must be an integer')
    .min(1, 'rating must be between 1 and 5')
    .max(5, 'rating must be between 1 and 5'),
  foodRating: z
    .number()
    .int('foodRating must be an integer')
    .min(1, 'foodRating must be between 1 and 5')
    .max(5, 'foodRating must be between 1 and 5')
    .optional(),
  comment: z.string().max(1000, 'Comment cannot exceed 1000 characters').optional().default(''),
  text: z.string().max(1000, 'Text cannot exceed 1000 characters').optional(),
});

export const getRestaurantReviewsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).default(20).transform((val) => Math.min(50, val)),
});

export const getCustomerReviewsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).default(20).transform((val) => Math.min(50, val)),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type GetRestaurantReviewsQueryInput = z.infer<typeof getRestaurantReviewsQuerySchema>;
export type GetCustomerReviewsQueryInput = z.infer<typeof getCustomerReviewsQuerySchema>;
