import { z } from 'zod';

export const toggleFavoriteSchema = z
  .object({
    targetType: z.enum(['restaurant', 'menu_item']).optional(),
    targetId: z.string().optional(),
    restaurantId: z.string().optional(),
    menuItemId: z.string().optional(),
  })
  .refine(
    (data) => {
      const hasTarget = Boolean(data.targetType && data.targetId);
      const hasRest = Boolean(data.restaurantId);
      const hasItem = Boolean(data.menuItemId);
      return hasTarget || hasRest || hasItem;
    },
    {
      message: 'Must provide either targetType & targetId, restaurantId, or menuItemId',
    }
  );

export const favoriteStatusQuerySchema = z.object({
  restaurantId: z.string().optional(),
  menuItemId: z.string().optional(),
  targetType: z.enum(['restaurant', 'menu_item']).optional(),
  targetId: z.string().optional(),
});

export type ToggleFavoriteInput = z.infer<typeof toggleFavoriteSchema>;
export type FavoriteStatusQueryInput = z.infer<typeof favoriteStatusQuerySchema>;
