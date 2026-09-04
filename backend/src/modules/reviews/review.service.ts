import mongoose from 'mongoose';
import { NotificationService } from '../notifications/notification.service.js';
import { Order } from '../../models/order.model.js';
import { Restaurant } from '../../models/restaurant.model.js';
import { Review, type IReview } from '../../models/review.model.js';
import { User } from '../../models/user.model.js';
import type { PaginatedResult } from '../restaurants/restaurant.service.js';
import { toReviewResponseDto, type ReviewResponseDto } from './review.mapper.js';
import type {
  CreateReviewInput,
  GetCustomerReviewsQueryInput,
  GetRestaurantReviewsQueryInput,
} from './review.schemas.js';

export interface RestaurantReviewsResult extends PaginatedResult<ReviewResponseDto> {
  summary: {
    ratingAverage: number;
    reviewCount: number;
  };
}

export class ReviewService {
  /**
   * Server-authoritative review creation.
   * Derives caller identity, order ownership, restaurant identity, and verification status server-side.
   */
  static async createReview(customerId: string, input: CreateReviewInput): Promise<ReviewResponseDto> {
    // 1. Authenticate user account
    const user = await User.findById(customerId);
    if (!user || !user.isActive) {
      const error = new Error('Customer account is inactive or invalid.') as Error & { statusCode?: number };
      error.statusCode = 401;
      throw error;
    }

    // 2. Load order
    if (!mongoose.Types.ObjectId.isValid(input.orderId)) {
      const error = new Error('Invalid order ID format') as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    const order = await Order.findById(input.orderId);
    if (!order) {
      const error = new Error('Order not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    // 3. Confirm order belongs to caller
    if (order.customerId.toString() !== customerId) {
      const error = new Error('You can only review your own orders.') as Error & { statusCode?: number };
      error.statusCode = 403;
      throw error;
    }

    // 4. Confirm order is completed
    if (order.status !== 'completed') {
      const error = new Error(
        `Only completed orders can be reviewed. Current status is '${order.status}'.`
      ) as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    // 5. Application-level check for duplicate review
    const existingReview = await Review.findOne({ orderId: order._id });
    if (existingReview) {
      const error = new Error('This order has already been reviewed.') as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    // 6. Create Review in MongoDB (Database unique constraint handles race conditions)
    try {
      const review = await Review.create({
        restaurantId: order.restaurantId,
        orderId: order._id,
        authorId: user._id,
        authorName: user.fullName,
        rating: input.rating,
        foodRating: input.foodRating ?? input.rating,
        text: (input.comment || input.text || '').trim(),
        isVerified: true,
      });

      // 7. Update aggregate rating on target Restaurant
      await ReviewService.updateRestaurantRatingSummary(order.restaurantId.toString());

      // 8. Dispatch Notification to Restaurant Admin
      await NotificationService.createNotification({
        restaurantId: order.restaurantId,
        role: 'RESTAURANT_ADMIN',
        type: 'NEW_REVIEW',
        title: `New ${review.rating}★ Review`,
        message: `${user.fullName} left a ${review.rating}★ review for your restaurant.`,
        link: `/restaurant/dashboard?tab=reviews`,
        metadata: { reviewId: review._id.toString(), rating: review.rating },
      }).catch(() => {});

      return toReviewResponseDto(review);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
        const error = new Error('This order has already been reviewed.') as Error & { statusCode?: number };
        error.statusCode = 400;
        throw error;
      }
      throw err;
    }
  }

  /**
   * Recalculates and updates ratingAverage and reviewCount on target Restaurant document.
   */
  static async updateRestaurantRatingSummary(restaurantId: string): Promise<void> {
    const objId = new mongoose.Types.ObjectId(restaurantId);
    const stats = await Review.aggregate([
      { $match: { restaurantId: objId } },
      {
        $group: {
          _id: '$restaurantId',
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      const ratingAverage = Number(stats[0].avgRating.toFixed(1));
      const reviewCount = stats[0].count;
      await Restaurant.findByIdAndUpdate(restaurantId, { ratingAverage, reviewCount });
    } else {
      await Restaurant.findByIdAndUpdate(restaurantId, { ratingAverage: 0, reviewCount: 0 });
    }
  }

  /**
   * Returns paginated public reviews for a restaurant.
   */
  static async getRestaurantReviews(
    identifier: string,
    input: GetRestaurantReviewsQueryInput
  ): Promise<RestaurantReviewsResult> {
    let restaurant;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      restaurant = await Restaurant.findById(identifier);
    }
    if (!restaurant) {
      restaurant = await Restaurant.findOne({ slug: identifier });
    }
    if (!restaurant) {
      const error = new Error('Restaurant not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    const page = Math.max(1, input.page);
    const limit = Math.min(50, Math.max(1, input.limit));
    const skip = (page - 1) * limit;

    const filter = { restaurantId: restaurant._id };

    const [total, documents] = await Promise.all([
      Review.countDocuments(filter),
      Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    const data = documents.map((doc) => toReviewResponseDto(doc as unknown as IReview));

    return {
      data,
      summary: {
        ratingAverage: restaurant.ratingAverage || 0,
        reviewCount: restaurant.reviewCount || 0,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Returns paginated reviews created by the authenticated customer.
   */
  static async getCustomerReviews(
    customerId: string,
    input: GetCustomerReviewsQueryInput
  ): Promise<PaginatedResult<ReviewResponseDto>> {
    const page = Math.max(1, input.page);
    const limit = Math.min(50, Math.max(1, input.limit));
    const skip = (page - 1) * limit;

    const filter = { authorId: customerId };

    const [total, documents] = await Promise.all([
      Review.countDocuments(filter),
      Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    const data = documents.map((doc) => toReviewResponseDto(doc as unknown as IReview));

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
   * Returns all reviews across the platform for Super Admin moderation.
   */
  static async getAllReviews(): Promise<ReviewResponseDto[]> {
    const documents = await Review.find().sort({ createdAt: -1 }).lean();
    return documents.map((doc) => toReviewResponseDto(doc as unknown as IReview));
  }

  /**
   * Moderates/deletes a review (Super Admin only).
   * Automatically updates restaurant average rating summary.
   */
  static async deleteReview(reviewId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      const error = new Error('Invalid review ID format') as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      const error = new Error('Review not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    const restaurantId = review.restaurantId.toString();
    await Review.findByIdAndDelete(review._id);

    // Recalculate rating summary for affected restaurant
    await ReviewService.updateRestaurantRatingSummary(restaurantId);
  }
}
