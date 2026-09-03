import { Schema, model, type Document, type Types } from 'mongoose';

export interface IMenuCategory extends Document {
  restaurantId: Types.ObjectId;
  name: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const menuCategorySchema = new Schema<IMenuCategory>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'restaurantId is required for MenuCategory'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Menu category name is required'],
      trim: true,
    },
    sortOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: Category name must be unique per restaurant
menuCategorySchema.index({ restaurantId: 1, name: 1 }, { unique: true });

export const MenuCategory = model<IMenuCategory>('MenuCategory', menuCategorySchema);
