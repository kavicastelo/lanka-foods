import { Schema, model, type Document, type Types } from 'mongoose';

export interface IFavorite extends Document {
  userId: Types.ObjectId;
  restaurantId?: Types.ObjectId;
  menuItemId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const favoriteSchema = new Schema<IFavorite>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required for Favorite'],
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      default: null,
    },
    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique indexes: prevent duplicate restaurant or item favorites per user
favoriteSchema.index(
  { userId: 1, restaurantId: 1 },
  { unique: true, partialFilterExpression: { restaurantId: { $type: 'objectId' } } }
);

favoriteSchema.index(
  { userId: 1, menuItemId: 1 },
  { unique: true, partialFilterExpression: { menuItemId: { $type: 'objectId' } } }
);

export const Favorite = model<IFavorite>('Favorite', favoriteSchema);
