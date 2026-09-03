import { z } from 'zod';

export const allowedMediaCategories = [
  'restaurant_cover',
  'restaurant_logo',
  'menu_item',
  'application_logo',
  'application_cover',
] as const;

export const allowedMediaMimeTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const requestUploadUrlSchema = z.object({
  category: z.enum(allowedMediaCategories, {
    required_error: 'category is required',
  }),
  fileName: z
    .string({ required_error: 'fileName is required' })
    .min(1, 'fileName cannot be empty')
    .refine((val) => !val.includes('..') && !val.includes('/') && !val.includes('\\'), {
      message: 'Filename contains invalid path traversal characters',
    }),
  fileType: z.enum(allowedMediaMimeTypes, {
    required_error: 'fileType must be image/jpeg, image/png, or image/webp',
  }),
  fileSize: z
    .number({ required_error: 'fileSize is required' })
    .int()
    .positive()
    .max(5 * 1024 * 1024, 'File size exceeds maximum limit of 5MB (5242880 bytes)'),
  restaurantId: z.string().optional(),
});

export const deleteMediaSchema = z.object({
  objectKey: z
    .string({ required_error: 'objectKey is required' })
    .min(1, 'objectKey cannot be empty')
    .refine((val) => !val.includes('..'), {
      message: 'Object key contains invalid path traversal characters',
    }),
  restaurantId: z.string().optional(),
});

export type RequestUploadUrlInput = z.infer<typeof requestUploadUrlSchema>;
export type DeleteMediaInput = z.infer<typeof deleteMediaSchema>;
