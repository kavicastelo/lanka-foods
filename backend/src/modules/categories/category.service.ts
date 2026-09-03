import { GlobalCategory, type IGlobalCategory } from '../../models/global-category.model.js';
import type { CreateCategoryInput, UpdateCategoryInput } from './category.schemas.js';

export class CategoryService {
  /**
   * Returns all active global categories for public discovery.
   */
  static async listActiveCategories(): Promise<IGlobalCategory[]> {
    return GlobalCategory.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
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
