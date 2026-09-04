import { GlobalCategory, type IGlobalCategory } from '../../models/global-category.model.js';
import { Restaurant } from '../../models/restaurant.model.js';
import type { CreateCategoryInput, UpdateCategoryInput } from './category.schemas.js';

export const DEFAULT_GLOBAL_CATEGORIES = [
  { name: 'Rice & Curry', slug: 'rice-and-curry', imageUrl: '🍚', sortOrder: 1 },
  { name: 'Kottu', slug: 'kottu', imageUrl: '🫓', sortOrder: 2 },
  { name: 'Hoppers', slug: 'hoppers', imageUrl: '🥞', sortOrder: 3 },
  { name: 'Short Eats', slug: 'short-eats', imageUrl: '🥟', sortOrder: 4 },
  { name: 'Biriyani', slug: 'biriyani', imageUrl: '🍲', sortOrder: 5 },
  { name: 'Seafood', slug: 'seafood', imageUrl: '🦀', sortOrder: 6 },
  { name: 'Vegetarian', slug: 'vegetarian', imageUrl: '🌱', sortOrder: 7 },
  { name: 'Desserts', slug: 'desserts', imageUrl: '🍮', sortOrder: 8 },
  { name: 'Cakes', slug: 'cakes', imageUrl: '🍰', sortOrder: 9 },
  { name: 'Snacks', slug: 'snacks', imageUrl: '🍢', sortOrder: 10 },
  { name: 'Beverages', slug: 'beverages', imageUrl: '🥤', sortOrder: 11 },
  { name: 'Catering', slug: 'catering', imageUrl: '🍽️', sortOrder: 12 },
];

export class CategoryService {
  /**
   * Seeds default global categories and syncs existing restaurant cuisines if missing.
   */
  static async seedDefaultCategories(): Promise<void> {
    try {
      for (const cat of DEFAULT_GLOBAL_CATEGORIES) {
        await GlobalCategory.updateOne(
          { slug: cat.slug },
          {
            $setOnInsert: {
              name: cat.name,
              slug: cat.slug,
              imageUrl: cat.imageUrl,
              sortOrder: cat.sortOrder,
              isActive: true,
            },
          },
          { upsert: true }
        );
      }

      // Scan existing active restaurants and sync their cuisines to GlobalCategory
      const restaurants = await Restaurant.find({ status: 'active' }, { cuisines: 1 }).lean();
      const allCuisines = restaurants.flatMap((r) => r.cuisines || []);
      if (allCuisines.length > 0) {
        await this.syncCategoriesFromCuisines(allCuisines);
      }
    } catch (err) {
      console.error('Error seeding default global categories:', err);
    }
  }

  /**
   * Real-time auto-sync: Ensures any new cuisines/categories defined by restaurants exist in GlobalCategory.
   */
  static async syncCategoriesFromCuisines(cuisines: string[]): Promise<void> {
    if (!cuisines || cuisines.length === 0) return;

    for (const rawCuisine of cuisines) {
      if (!rawCuisine || typeof rawCuisine !== 'string') continue;
      const trimmed = rawCuisine.trim();
      if (!trimmed) continue;

      const slug = trimmed
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      if (!slug) continue;

      const formattedName = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);

      await GlobalCategory.updateOne(
        { slug },
        {
          $setOnInsert: {
            name: formattedName,
            slug,
            imageUrl: '',
            sortOrder: 50,
            isActive: true,
          },
        },
        { upsert: true }
      ).catch(() => {});
    }
  }

  /**
   * Returns all active global categories for public discovery.
   */
  static async listActiveCategories(): Promise<IGlobalCategory[]> {
    let categories = await GlobalCategory.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    if (categories.length === 0) {
      await this.seedDefaultCategories();
      categories = await GlobalCategory.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    }
    return categories;
  }

  /**
   * Creates a new GlobalCategory (SuperAdmin only).
   */
  static async createCategory(input: CreateCategoryInput): Promise<IGlobalCategory> {
    const normalizedSlug = input.slug.toLowerCase().trim();
    const existing = await GlobalCategory.findOne({ slug: normalizedSlug });

    if (existing) {
      const error = new Error('Category slug already exists.') as Error & { statusCode?: number };
      error.statusCode = 409;
      throw error;
    }

    const category = await GlobalCategory.create({
      name: input.name.trim(),
      slug: normalizedSlug,
      imageUrl: input.imageUrl || '',
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    });

    return category;
  }

  /**
   * Updates an existing GlobalCategory (SuperAdmin only).
   */
  static async updateCategory(id: string, input: UpdateCategoryInput): Promise<IGlobalCategory> {
    const category = await GlobalCategory.findById(id);
    if (!category) {
      const error = new Error('Category not found.') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    if (input.name !== undefined) category.name = input.name.trim();
    if (input.slug !== undefined) category.slug = input.slug.toLowerCase().trim();
    if (input.imageUrl !== undefined) category.imageUrl = input.imageUrl;
    if (input.sortOrder !== undefined) category.sortOrder = input.sortOrder;
    if (input.isActive !== undefined) category.isActive = input.isActive;

    await category.save();
    return category;
  }

  /**
   * Soft-deactivates a GlobalCategory (SuperAdmin only).
   */
  static async deleteCategory(id: string): Promise<IGlobalCategory> {
    const category = await GlobalCategory.findById(id);
    if (!category) {
      const error = new Error('Category not found.') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    category.isActive = false;
    await category.save();
    return category;
  }
}
