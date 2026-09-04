import { z } from 'zod';

export const QueryNotificationsSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  unreadOnly: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
});

export const PushSubscribeSchema = z.object({
  endpoint: z.string().url('Endpoint must be a valid URL'),
  keys: z.object({
    p256dh: z.string().min(1, 'p256dh key is required'),
    auth: z.string().min(1, 'auth key is required'),
  }),
  userAgent: z.string().optional().default(''),
});

export type QueryNotificationsInput = z.infer<typeof QueryNotificationsSchema>;
export type PushSubscribeInput = z.infer<typeof PushSubscribeSchema>;
