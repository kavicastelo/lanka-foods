import { Schema, model, type Document, type Types } from 'mongoose';

export interface IReview extends Document {
  restaurantId: Types.ObjectId;
  orderId: Types.ObjectId;
  authorId: Types.ObjectId;
  authorName: string;
  rating: number; // 1 to 5
  foodRating: number; // 1 to 5
  text: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'restaurantId is required for Review'],
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'orderId is required for Review'],
      unique: true, // Guarantees at most 1 review per order at database level
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'authorId is required for Review'],
      index: true,
    },
    authorName: {
      type: String,
      required: [true, 'authorName is required'],
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, 'rating is required'],
      min: 1,
      max: 5,
    },
    foodRating: {
      type: Number,
      required: [true, 'foodRating is required'],
      min: 1,
      max: 5,
    },
    text: { type: String, default: '', trim: true },
    isVerified: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ restaurantId: 1, createdAt: -1 });
reviewSchema.index({ authorId: 1, createdAt: -1 });

export const Review = model<IReview>('Review', reviewSchema);
