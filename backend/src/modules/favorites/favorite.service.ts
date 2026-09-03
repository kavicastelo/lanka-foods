import mongoose from 'mongoose';
import { Favorite, type IFavorite } from '../../models/favorite.model.js';
import { MenuItem, type IMenuItem } from '../../models/menu-item.model.js';
import { Restaurant, type IRestaurant } from '../../models/restaurant.model.js';
import { User } from '../../models/user.model.js';
import { toFavoriteResponseDto, type FavoriteResponseDto } from './favorite.mapper.js';
import type { FavoriteStatusQueryInput, ToggleFavoriteInput } from './favorite.schemas.js';

export interface UserFavoritesResult {
  restaurants: string[];
  items: string[];
  raw: FavoriteResponseDto[];
}

export class FavoriteService {
  /**
   * Retrieves all favorites for authenticated customer strictly derived from session identity.
   */
  static async getUserFavorites(userId: string): Promise<UserFavoritesResult> {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      const error = new Error('Customer account is inactive or invalid.') as Error & { statusCode?: number };
      error.statusCode = 401;
      throw error;
    }

    const favorites = await Favorite.find({ userId })
      .populate<{ restaurantId?: IRestaurant }>('restaurantId')
      .populate<{ menuItemId?: IMenuItem }>('menuItemId')
      .sort({ createdAt: -1 });

    const restaurantIds: string[] = [];
    const itemIds: string[] = [];
    const rawDtos: FavoriteResponseDto[] = [];

    for (const fav of favorites) {
      const populatedRest = fav.restaurantId && typeof fav.restaurantId === 'object' && 'name' in fav.restaurantId
        ? (fav.restaurantId as unknown as IRestaurant)
        : null;
      const populatedItem = fav.menuItemId && typeof fav.menuItemId === 'object' && 'name' in fav.menuItemId
        ? (fav.menuItemId as unknown as IMenuItem)
        : null;

      const dto = toFavoriteResponseDto(fav as unknown as Partial<IFavorite> & { _id: unknown }, populatedRest, populatedItem);
      rawDtos.push(dto);

      if (dto.restaurantId && !restaurantIds.includes(dto.restaurantId)) {
        restaurantIds.push(dto.restaurantId);
      }
      if (dto.menuItemId && !itemIds.includes(dto.menuItemId)) {
        itemIds.push(dto.menuItemId);
      }
    }

    return {
      restaurants: restaurantIds,
      items: itemIds,
      raw: rawDtos,
    };
  }

  /**
   * Toggles favorite status for a target restaurant or menu item.
   */
  static async toggleFavorite(
    userId: string,
    input: ToggleFavoriteInput
  ): Promise<{ favorited: boolean; message: string; favorite?: FavoriteResponseDto }> {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      const error = new Error('Customer account is inactive or invalid.') as Error & { statusCode?: number };
      error.statusCode = 401;
      throw error;
    }

    const isRest = input.restaurantId || input.targetType === 'restaurant';
    const targetId = input.targetId || input.restaurantId || input.menuItemId;

    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
      const error = new Error('Invalid target ID format') as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    if (isRest) {
      const restaurant = await Restaurant.findById(targetId);
      if (!restaurant) {
        const error = new Error('Restaurant not found') as Error & { statusCode?: number };
        error.statusCode = 404;
        throw error;
      }

      const existing = await Favorite.findOne({ userId, restaurantId: restaurant._id });
      if (existing) {
        await Favorite.deleteOne({ _id: existing._id });
        return { favorited: false, message: 'Removed from favorites' };
      }

      try {
        const created = await Favorite.create({ userId: user._id, restaurantId: restaurant._id });
        return { favorited: true, message: 'Added to favorites', favorite: toFavoriteResponseDto(created, restaurant, null) };
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
          return { favorited: true, message: 'Already favorited' };
        }
        throw err;
      }
    } else {
      const menuItem = await MenuItem.findById(targetId);
      if (!menuItem) {
        const error = new Error('Menu item not found') as Error & { statusCode?: number };
        error.statusCode = 404;
        throw error;
      }

      const existing = await Favorite.findOne({ userId, menuItemId: menuItem._id });
      if (existing) {
        await Favorite.deleteOne({ _id: existing._id });
        return { favorited: false, message: 'Removed from favorites' };
      }

      try {
        const created = await Favorite.create({ userId: user._id, menuItemId: menuItem._id });
        return { favorited: true, message: 'Added to favorites', favorite: toFavoriteResponseDto(created, null, menuItem) };
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
          return { favorited: true, message: 'Already favorited' };
        }
        throw err;
      }
    }
  }

  /**
   * Idempotently adds a restaurant favorite.
   */
  static async addRestaurantFavorite(
    userId: string,
    restaurantId: string
  ): Promise<{ favorited: boolean; favorite: FavoriteResponseDto }> {
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      const error = new Error('Invalid restaurant ID format') as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      const error = new Error('Restaurant not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    const existing = await Favorite.findOne({ userId, restaurantId: restaurant._id });
    if (existing) {
      return { favorited: true, favorite: toFavoriteResponseDto(existing, restaurant, null) };
    }

    try {
      const created = await Favorite.create({ userId, restaurantId: restaurant._id });
      return { favorited: true, favorite: toFavoriteResponseDto(created, restaurant, null) };
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
        const raceCreated = await Favorite.findOne({ userId, restaurantId: restaurant._id });
        return { favorited: true, favorite: toFavoriteResponseDto(raceCreated!, restaurant, null) };
      }
      throw err;
    }
  }

  /**
   * Idempotently removes a restaurant favorite. Ownership safety enforced by matching userId.
   */
  static async removeRestaurantFavorite(
    userId: string,
    restaurantId: string
  ): Promise<{ favorited: boolean; message: string }> {
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      const error = new Error('Invalid restaurant ID format') as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    await Favorite.findOneAndDelete({ userId, restaurantId });
    return { favorited: false, message: 'Removed from favorites' };
  }

  /**
   * Idempotently adds a menu item favorite.
   */
  static async addMenuItemFavorite(
    userId: string,
    menuItemId: string
  ): Promise<{ favorited: boolean; favorite: FavoriteResponseDto }> {
    if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
      const error = new Error('Invalid menu item ID format') as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) {
      const error = new Error('Menu item not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    const existing = await Favorite.findOne({ userId, menuItemId: menuItem._id });
    if (existing) {
      return { favorited: true, favorite: toFavoriteResponseDto(existing, null, menuItem) };
    }

    try {
      const created = await Favorite.create({ userId, menuItemId: menuItem._id });
      return { favorited: true, favorite: toFavoriteResponseDto(created, null, menuItem) };
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
        const raceCreated = await Favorite.findOne({ userId, menuItemId: menuItem._id });
        return { favorited: true, favorite: toFavoriteResponseDto(raceCreated!, null, menuItem) };
      }
      throw err;
    }
  }

  /**
   * Idempotently removes a menu item favorite. Ownership safety enforced by matching userId.
   */
  static async removeMenuItemFavorite(
    userId: string,
    menuItemId: string
  ): Promise<{ favorited: boolean; message: string }> {
    if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
      const error = new Error('Invalid menu item ID format') as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    await Favorite.findOneAndDelete({ userId, menuItemId });
    return { favorited: false, message: 'Removed from favorites' };
  }

  /**
   * Checks if a restaurant or menu item is favorited by the authenticated customer.
   */
  static async getFavoriteStatus(userId: string, input: FavoriteStatusQueryInput): Promise<{ isFavorited: boolean }> {
    const isRest = input.restaurantId || input.targetType === 'restaurant';
    const targetId = input.targetId || input.restaurantId || input.menuItemId;

    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
      return { isFavorited: false };
    }

    if (isRest) {
      const existing = await Favorite.findOne({ userId, restaurantId: targetId });
      return { isFavorited: Boolean(existing) };
    } else {
      const existing = await Favorite.findOne({ userId, menuItemId: targetId });
      return { isFavorited: Boolean(existing) };
    }
  }
}
