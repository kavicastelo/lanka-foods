import { Schema, model, type Document } from 'mongoose';

export interface IGlobalCategory extends Document {
  name: string;
  slug: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const globalCategorySchema = new Schema<IGlobalCategory>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Category slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    imageUrl: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
  }
);

export const GlobalCategory = model<IGlobalCategory>('GlobalCategory', globalCategorySchema);
