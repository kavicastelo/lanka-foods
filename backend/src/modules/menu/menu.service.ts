import { MenuCategory } from '../../models/menu-category.model.js';
import { MenuItem, type IMenuItem } from '../../models/menu-item.model.js';
import { Restaurant } from '../../models/restaurant.model.js';
import {
  toOwnerMenuCategoryDto,
  toOwnerMenuItemDto,
  toPublicMenuItemDto,
  type OwnerMenuCategoryDto,
  type OwnerMenuItemDto,
  type PublicMenuCatalogDto,
  type PublicMenuCategoryDto,
} from './menu.mapper.js';
import type {
  CreateMenuCategoryInput,
  CreateMenuItemInput,
  UpdateMenuCategoryInput,
  UpdateMenuItemInput,
} from './menu.schemas.js';

export class MenuService {
  /**
   * Returns public menu catalog for an active restaurant by slug.
   * Includes active categories and available items only.
   */
  static async getPublicMenuByRestaurantSlug(slug: string): Promise<PublicMenuCatalogDto> {
    const normalizedSlug = slug.toLowerCase().trim();
    const restaurant = await Restaurant.findOne({ slug: normalizedSlug, status: 'active' }).lean();

    if (!restaurant) {
      const error = new Error('Restaurant not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    const [categories, items] = await Promise.all([
      MenuCategory.find({ restaurantId: restaurant._id }).sort({ sortOrder: 1, name: 1 }).lean(),
      MenuItem.find({ restaurantId: restaurant._id, isAvailable: true })
        .sort({ sortOrder: 1, name: 1 })
        .lean(),
    ]);

    // Map items grouped by categoryId
    const itemMap = new Map<string, typeof items>();
    for (const item of items) {
      const catId = item.categoryId.toString();
      if (!itemMap.has(catId)) {
        itemMap.set(catId, []);
      }
      itemMap.get(catId)!.push(item);
    }

    const publicCategories: PublicMenuCategoryDto[] = categories.map((cat) => {
      const catId = cat._id.toString();
      const catItems = itemMap.get(catId) || [];
      return {
        id: catId,
        name: cat.name,
        sortOrder: cat.sortOrder,
        items: catItems.map((item) => toPublicMenuItemDto(item as unknown as IMenuItem)),
      };
    });

    return {
      restaurant: {
        id: restaurant._id.toString(),
        name: restaurant.name,
        slug: restaurant.slug,
      },
      categories: publicCategories,
    };
  }

  /**
   * Helper: Resolves authenticated user's restaurant or throws 404.
   */
  private static async getOwnerRestaurantOrThrow(ownerUserId: string) {
    const restaurant = await Restaurant.findOne({ ownerId: ownerUserId });
    if (!restaurant) {
      const error = new Error('No restaurant found associated with this owner account.') as Error & {
        statusCode?: number;
      };
      error.statusCode = 404;
      throw error;
    }
    return restaurant;
  }

  // --- MENU CATEGORIES (OWNER) ---

  static async getOwnerMenuCategories(ownerUserId: string): Promise<OwnerMenuCategoryDto[]> {
    const restaurant = await this.getOwnerRestaurantOrThrow(ownerUserId);
    const categories = await MenuCategory.find({ restaurantId: restaurant._id }).sort({ sortOrder: 1, name: 1 });
    return categories.map((cat) => toOwnerMenuCategoryDto(cat));
  }

  static async createMenuCategory(
    ownerUserId: string,
    input: CreateMenuCategoryInput
  ): Promise<OwnerMenuCategoryDto> {
    const restaurant = await this.getOwnerRestaurantOrThrow(ownerUserId);

    const existingName = await MenuCategory.findOne({
      restaurantId: restaurant._id,
      name: input.name.trim(),
    });

    if (existingName) {
      const error = new Error('Category name already exists for this restaurant.') as Error & {
        statusCode?: number;
      };
      error.statusCode = 409;
      throw error;
    }

    // Mass assignment defense: restaurantId is derived strictly from owner's restaurant
    const category = await MenuCategory.create({
      restaurantId: restaurant._id,
      name: input.name.trim(),
      sortOrder: input.sortOrder ?? 0,
    });

    return toOwnerMenuCategoryDto(category);
  }

  static async updateMenuCategory(
    ownerUserId: string,
    categoryId: string,
    input: UpdateMenuCategoryInput
  ): Promise<OwnerMenuCategoryDto> {
    const restaurant = await this.getOwnerRestaurantOrThrow(ownerUserId);

    const category = await MenuCategory.findById(categoryId);
    if (!category || category.restaurantId.toString() !== restaurant._id.toString()) {
      const error = new Error('Category not found or does not belong to your restaurant.') as Error & {
        statusCode?: number;
      };
      error.statusCode = 404;
      throw error;
    }

    if (input.name !== undefined && input.name.trim() !== category.name) {
      const existingName = await MenuCategory.findOne({
        restaurantId: restaurant._id,
        name: input.name.trim(),
        _id: { $ne: category._id },
      });
      if (existingName) {
        const error = new Error('Category name already exists for this restaurant.') as Error & {
          statusCode?: number;
        };
        error.statusCode = 409;
        throw error;
      }
      category.name = input.name.trim();
    }

    if (input.sortOrder !== undefined) {
      category.sortOrder = input.sortOrder;
    }

    await category.save();
    return toOwnerMenuCategoryDto(category);
  }

  static async deleteMenuCategory(ownerUserId: string, categoryId: string): Promise<void> {
    const restaurant = await this.getOwnerRestaurantOrThrow(ownerUserId);

    const category = await MenuCategory.findById(categoryId);
    if (!category || category.restaurantId.toString() !== restaurant._id.toString()) {
      const error = new Error('Category not found or does not belong to your restaurant.') as Error & {
        statusCode?: number;
      };
      error.statusCode = 404;
      throw error;
    }

    // Category Deletion Safety Check: Block deletion if menu items reference this category
    const itemCount = await MenuItem.countDocuments({
      restaurantId: restaurant._id,
      categoryId: category._id,
    });

    if (itemCount > 0) {
      const error = new Error(
        'Cannot delete category containing existing menu items. Delete or reassign items first.'
      ) as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    await category.deleteOne();
  }

  // --- MENU ITEMS (OWNER) ---

  static async getOwnerMenuItems(ownerUserId: string): Promise<OwnerMenuItemDto[]> {
    const restaurant = await this.getOwnerRestaurantOrThrow(ownerUserId);
    const items = await MenuItem.find({ restaurantId: restaurant._id }).sort({ sortOrder: 1, name: 1 });
    return items.map((item) => toOwnerMenuItemDto(item));
  }

  static async createMenuItem(ownerUserId: string, input: CreateMenuItemInput): Promise<OwnerMenuItemDto> {
    const restaurant = await this.getOwnerRestaurantOrThrow(ownerUserId);

    // Cross-Relationship Validation: Category MUST exist AND belong to the SAME restaurant
    const category = await MenuCategory.findById(input.categoryId);
    if (!category || category.restaurantId.toString() !== restaurant._id.toString()) {
      const error = new Error(
        'Selected category does not exist or does not belong to your restaurant.'
      ) as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    // Mass assignment defense: restaurantId derived strictly from verified owner restaurant
    const menuItem = await MenuItem.create({
      restaurantId: restaurant._id,
      categoryId: category._id,
      name: input.name.trim(),
      description: input.description?.trim() || '',
      price: input.price,
      imageUrl: input.imageUrl || '',
      isVegetarian: input.isVegetarian ?? false,
      isAvailable: input.isAvailable ?? true,
      isPopular: input.isPopular ?? false,
      sortOrder: input.sortOrder ?? 0,
    });

    return toOwnerMenuItemDto(menuItem);
  }

  static async updateMenuItem(
    ownerUserId: string,
    itemId: string,
    input: UpdateMenuItemInput
  ): Promise<OwnerMenuItemDto> {
    const restaurant = await this.getOwnerRestaurantOrThrow(ownerUserId);

    const menuItem = await MenuItem.findById(itemId);
    if (!menuItem || menuItem.restaurantId.toString() !== restaurant._id.toString()) {
      const error = new Error('Menu item not found or does not belong to your restaurant.') as Error & {
        statusCode?: number;
      };
      error.statusCode = 404;
      throw error;
    }

    // Cross-Relationship Validation if category is changed
    if (input.categoryId !== undefined) {
      const category = await MenuCategory.findById(input.categoryId);
      if (!category || category.restaurantId.toString() !== restaurant._id.toString()) {
        const error = new Error(
          'Selected category does not exist or does not belong to your restaurant.'
        ) as Error & { statusCode?: number };
        error.statusCode = 400;
        throw error;
      }
      menuItem.categoryId = category._id;
    }

    // Allowlisted field updates
    if (input.name !== undefined) menuItem.name = input.name.trim();
    if (input.description !== undefined) menuItem.description = input.description.trim();
    if (input.price !== undefined) menuItem.price = input.price;
    if (input.imageUrl !== undefined) menuItem.imageUrl = input.imageUrl;
    if (input.isVegetarian !== undefined) menuItem.isVegetarian = input.isVegetarian;
    if (input.isAvailable !== undefined) menuItem.isAvailable = input.isAvailable;
    if (input.isPopular !== undefined) menuItem.isPopular = input.isPopular;
    if (input.sortOrder !== undefined) menuItem.sortOrder = input.sortOrder;

    await menuItem.save();
    return toOwnerMenuItemDto(menuItem);
  }

  static async deleteMenuItem(ownerUserId: string, itemId: string): Promise<void> {
    const restaurant = await this.getOwnerRestaurantOrThrow(ownerUserId);

    const menuItem = await MenuItem.findById(itemId);
    if (!menuItem || menuItem.restaurantId.toString() !== restaurant._id.toString()) {
      const error = new Error('Menu item not found or does not belong to your restaurant.') as Error & {
        statusCode?: number;
      };
      error.statusCode = 404;
      throw error;
    }

    await menuItem.deleteOne();
  }
}
