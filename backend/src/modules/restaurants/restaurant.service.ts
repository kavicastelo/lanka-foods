import { Restaurant, type IRestaurant } from '../../models/restaurant.model.js';
import { escapeRegex } from '../../utils/regex.js';
import {
  toOwnerRestaurantDto,
  toPublicRestaurantDto,
  type OwnerRestaurantDto,
  type PublicRestaurantDto,
} from './restaurant.mapper.js';
import type { RestaurantQueryInput, UpdateRestaurantSettingsInput } from './restaurant.schemas.js';

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class RestaurantService {
  /**
   * Queries active, publicly visible restaurants with pagination, sorting, and filter controls.
   */
  static async listPublicRestaurants(
    input: RestaurantQueryInput
  ): Promise<PaginatedResult<PublicRestaurantDto>> {
    const page = Math.max(1, input.page);
    const limit = Math.min(50, Math.max(1, input.limit));
    const skip = (page - 1) * limit;

    // Build safe MongoDB filter (prevent operator injection)
    const filter: Record<string, unknown> = {
      status: 'active',
    };

    if (input.city) {
      filter.city = new RegExp(`^${escapeRegex(input.city)}$`, 'i');
    }

    if (input.cuisine) {
      filter.cuisines = { $in: [new RegExp(escapeRegex(input.cuisine), 'i')] };
    }

    if (input.search) {
      const searchRegex = new RegExp(escapeRegex(input.search), 'i');
      filter.$or = [
        { name: searchRegex },
        { city: searchRegex },
        { description: searchRegex },
        { cuisines: { $in: [searchRegex] } },
      ];
    }

    const sortOrderNum = input.sortOrder === 'asc' ? 1 : -1;
    const sortObject: Record<string, 1 | -1> = { [input.sortBy]: sortOrderNum };

    const [total, documents] = await Promise.all([
      Restaurant.countDocuments(filter),
      Restaurant.find(filter).sort(sortObject).skip(skip).limit(limit).lean(),
    ]);

    const data = documents.map((doc) => toPublicRestaurantDto(doc as unknown as IRestaurant));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves a single active restaurant by public slug.
   */
  static async getPublicRestaurantBySlug(slug: string): Promise<PublicRestaurantDto> {
    const normalizedSlug = slug.toLowerCase().trim();
    const restaurant = await Restaurant.findOne({ slug: normalizedSlug, status: 'active' }).lean();

    if (!restaurant) {
      const error = new Error('Restaurant not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    return toPublicRestaurantDto(restaurant as unknown as IRestaurant);
  }

  /**
   * Retrieves restaurant associated with authenticated owner account.
   */
  static async getOwnerRestaurant(ownerUserId: string): Promise<OwnerRestaurantDto> {
    const restaurant = await Restaurant.findOne({ ownerId: ownerUserId }).lean();

    if (!restaurant) {
      const error = new Error('No restaurant found associated with this owner account.') as Error & {
        statusCode?: number;
      };
      error.statusCode = 404;
      throw error;
    }

    return toOwnerRestaurantDto(restaurant as unknown as IRestaurant);
  }

  /**
   * Updates settings for the authenticated owner's restaurant.
   * Mass assignment defense: updates only allowlisted fields. Protected fields (ownerId, status, commissionRate) are ignored.
   */
  static async updateOwnerSettings(
    ownerUserId: string,
    input: UpdateRestaurantSettingsInput
  ): Promise<OwnerRestaurantDto> {
    const restaurant = await Restaurant.findOne({ ownerId: ownerUserId });

    if (!restaurant) {
      const error = new Error('No restaurant found associated with this owner account.') as Error & {
        statusCode?: number;
      };
      error.statusCode = 404;
      throw error;
    }

    // Apply allowlisted input updates
    if (input.name !== undefined) restaurant.name = input.name;
    if (input.description !== undefined) restaurant.description = input.description;
    if (input.phone !== undefined) restaurant.phone = input.phone;
    if (input.email !== undefined) restaurant.email = input.email;
    if (input.address !== undefined) restaurant.address = input.address;
    if (input.city !== undefined) restaurant.city = input.city;
    if (input.prepTime !== undefined) restaurant.prepTime = input.prepTime;
    if (input.minOrder !== undefined) restaurant.minOrder = input.minOrder;
    if (input.deliveryFee !== undefined) restaurant.deliveryFee = input.deliveryFee;
    if (input.pickup !== undefined) restaurant.pickup = input.pickup;
    if (input.delivery !== undefined) restaurant.delivery = input.delivery;
    if (input.halal !== undefined) restaurant.halal = input.halal;
    if (input.catering !== undefined) restaurant.catering = input.catering;
    if (input.isOpen !== undefined) restaurant.isOpen = input.isOpen;
    if (input.hours !== undefined) restaurant.hours = input.hours;
    if (input.timeSlots !== undefined) restaurant.timeSlots = input.timeSlots;
    if (input.cuisines !== undefined) restaurant.cuisines = input.cuisines;
    if (input.priceRange !== undefined) restaurant.priceRange = input.priceRange;
    if (input.coverImageUrl !== undefined) restaurant.coverImageUrl = input.coverImageUrl;
    if (input.logoText !== undefined) restaurant.logoText = input.logoText;

    await restaurant.save();

    return toOwnerRestaurantDto(restaurant);
  }
}
