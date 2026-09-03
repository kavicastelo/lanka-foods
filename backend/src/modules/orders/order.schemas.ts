import { z } from 'zod';

export const createOrderItemSchema = z.object({
  menuItemId: z.string({ required_error: 'menuItemId is required' }).min(1, 'menuItemId is required'),
  quantity: z
    .number({ required_error: 'quantity is required' })
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(99, 'Quantity cannot exceed 99'),
  instructions: z.string().max(200).optional().default(''),
});

export const createOrderSchema = z
  .object({
    restaurantId: z.string({ required_error: 'restaurantId is required' }).min(1, 'restaurantId is required'),
    items: z
      .array(createOrderItemSchema)
      .min(1, 'Order must contain at least one item')
      .max(50, 'Order cannot contain more than 50 item lines'),
    deliveryType: z.enum(['pickup', 'delivery'], {
      required_error: 'deliveryType must be either pickup or delivery',
    }),
    deliveryAddress: z.string().max(300).optional().default(''),
    scheduledDate: z.string().max(20).optional().default(''),
    scheduledTime: z.string().max(20).optional().default(''),
    instructions: z.string().max(500).optional().default(''),
    paymentMethod: z.enum(['card', 'mobile', 'pickup']).optional().default('pickup'),
  })
  .refine(
    (data) => {
      if (data.deliveryType === 'delivery') {
        return typeof data.deliveryAddress === 'string' && data.deliveryAddress.trim().length >= 5;
      }
      return true;
    },
    {
      message: 'Delivery address is required (at least 5 characters) for delivery orders',
      path: ['deliveryAddress'],
    }
  );

export const updateOrderStatusSchema = z.object({
  status: z.enum(['accepted', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled', 'rejected'], {
    required_error: 'Valid status is required',
  }),
});

export const customerOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).default(20).transform((val) => Math.min(50, val)),
  status: z
    .enum(['received', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled', 'rejected'])
    .optional(),
});

export const restaurantOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).default(20).transform((val) => Math.min(50, val)),
  status: z
    .enum(['received', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled', 'rejected'])
    .optional(),
  deliveryType: z.enum(['pickup', 'delivery']).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type CustomerOrdersQueryInput = z.infer<typeof customerOrdersQuerySchema>;
export type RestaurantOrdersQueryInput = z.infer<typeof restaurantOrdersQuerySchema>;
