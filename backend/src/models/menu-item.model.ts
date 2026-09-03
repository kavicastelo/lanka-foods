import { Schema, model, type Document, type Types } from 'mongoose';

export interface IMenuItem extends Document {
  restaurantId: Types.ObjectId;
  categoryId: Types.ObjectId;
  name: string;
  description: string;
  price: number; // in cents
  imageUrl: string;
  isVegetarian: boolean;
  isAvailable: boolean;
  isPopular: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const menuItemSchema = new Schema<IMenuItem>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'restaurantId is required for MenuItem'],
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'MenuCategory',
      required: [true, 'categoryId is required for MenuItem'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'MenuItem name is required'],
      trim: true,
    },
    description: { type: String, default: '', trim: true },
    price: {
      type: Number,
      required: [true, 'MenuItem price is required'],
      min: [0, 'Price cannot be negative'],
    },
    imageUrl: { type: String, default: '' },
    isVegetarian: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true, index: true },
    isPopular: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

menuItemSchema.index({ restaurantId: 1, isAvailable: 1 });

export const MenuItem = model<IMenuItem>('MenuItem', menuItemSchema);
