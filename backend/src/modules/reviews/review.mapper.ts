import type { IReview } from '../../models/review.model.js';

export interface ReviewResponseDto {
  id: string;
  restaurantId: string;
  orderId: string;
  authorId: string;
  authorName: string;
  rating: number;
  foodRating: number;
  comment: string;
  isVerified: boolean;
  createdAt: string;
}

export function toReviewResponseDto(review: Partial<IReview> & { _id: unknown }): ReviewResponseDto {
  return {
    id: review._id ? review._id.toString() : '',
    restaurantId: review.restaurantId ? review.restaurantId.toString() : '',
    orderId: review.orderId ? review.orderId.toString() : '',
    authorId: review.authorId ? review.authorId.toString() : '',
    authorName: review.authorName || 'Anonymous',
    rating: review.rating ?? 5,
    foodRating: review.foodRating ?? review.rating ?? 5,
    comment: review.text || '',
    isVerified: review.isVerified ?? true,
    createdAt: review.createdAt ? new Date(review.createdAt).toISOString() : new Date().toISOString(),
  };
}
