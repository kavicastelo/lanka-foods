import type { IFavorite } from '../../models/favorite.model.js';
import type { IMenuItem } from '../../models/menu-item.model.js';
import type { IRestaurant } from '../../models/restaurant.model.js';

export interface FavoriteRestaurantSummary {
  id: string;
  name: string;
  slug: string;
  coverImageUrl: string;
  city: string;
  ratingAverage: number;
  reviewCount: number;
}

export interface FavoriteMenuItemSummary {
  id: string;
  restaurantId: string;
  name: string;
  price: number;
  description: string;
  isAvailable: boolean;
}

export interface FavoriteResponseDto {
  id: string;
  userId: string;
  targetType: 'restaurant' | 'menu_item';
  targetId: string;
  restaurantId?: string;
  menuItemId?: string;
  restaurant?: FavoriteRestaurantSummary;
  menuItem?: FavoriteMenuItemSummary;
  createdAt: string;
}

function extractIdString(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>;
    if (obj._id) {
      return String(obj._id);
    }
    if (obj.id) {
      return String(obj.id);
    }
  }
  return String(val);
}

export function toFavoriteResponseDto(
  favorite: Partial<IFavorite> & { _id: unknown },
  populatedRestaurant?: IRestaurant | null,
  populatedMenuItem?: IMenuItem | null
): FavoriteResponseDto {
  const restId = populatedRestaurant ? populatedRestaurant._id.toString() : extractIdString(favorite.restaurantId);
  const itemId = populatedMenuItem ? populatedMenuItem._id.toString() : extractIdString(favorite.menuItemId);

  const isRestaurant = Boolean(restId);
  const targetType: 'restaurant' | 'menu_item' = isRestaurant ? 'restaurant' : 'menu_item';
  const targetId = isRestaurant ? restId : itemId;

  const dto: FavoriteResponseDto = {
    id: favorite._id ? favorite._id.toString() : '',
    userId: favorite.userId ? favorite.userId.toString() : '',
    targetType,
    targetId,
    createdAt: favorite.createdAt ? new Date(favorite.createdAt).toISOString() : new Date().toISOString(),
  };

  if (restId) {
    dto.restaurantId = restId;
  }
  if (itemId) {
    dto.menuItemId = itemId;
  }

  if (populatedRestaurant) {
    dto.restaurant = {
      id: populatedRestaurant._id.toString(),
      name: populatedRestaurant.name,
      slug: populatedRestaurant.slug,
      coverImageUrl: populatedRestaurant.coverImageUrl || '',
      city: populatedRestaurant.city || '',
      ratingAverage: populatedRestaurant.ratingAverage || 0,
      reviewCount: populatedRestaurant.reviewCount || 0,
    };
  }

  if (populatedMenuItem) {
    dto.menuItem = {
      id: populatedMenuItem._id.toString(),
      restaurantId: populatedMenuItem.restaurantId.toString(),
      name: populatedMenuItem.name,
      price: populatedMenuItem.price,
      description: populatedMenuItem.description || '',
      isAvailable: populatedMenuItem.isAvailable,
    };
  }

  return dto;
}
