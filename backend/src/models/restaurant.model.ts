import { Schema, model, type Document, type Types } from 'mongoose';

export type RestaurantStatus = 'pending' | 'active' | 'suspended' | 'rejected' | 'changes_requested';
export type PriceRange = '€' | '€€' | '€€€';

export interface IRestaurant extends Document {
  name: string;
  slug: string;
  ownerId: Types.ObjectId;
  city: string;
  address: string;
  phone: string;
  email: string;
  coverImageUrl: string;
  logoText: string;
  description: string;
  cuisines: string[];
  priceRange: PriceRange;
  prepTime: string;
  minOrder: number; // in cents
  deliveryFee: number; // in cents
  pickup: boolean;
  delivery: boolean;
  halal: boolean;
  catering: boolean;
  isOpen: boolean;
  hours: string;
  timeSlots: string[];
  featured: boolean;
  status: RestaurantStatus;
  commissionRate?: number; // optional percentage override
  ratingAverage: number; // e.g. 4.5
  reviewCount: number; // e.g. 12
  createdAt: Date;
  updatedAt: Date;
}

const restaurantSchema = new Schema<IRestaurant>(
  {
    name: {
      type: String,
      required: [true, 'Restaurant name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Restaurant slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Restaurant ownerId is required'],
      index: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true,
    },
    address: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true },
    coverImageUrl: { type: String, default: '' },
    logoText: { type: String, default: '' },
    description: { type: String, default: '' },
    cuisines: { type: [String], default: [] },
    priceRange: {
      type: String,
      enum: ['€', '€€', '€€€'],
      default: '€€',
    },
    prepTime: { type: String, default: '20-30 min' },
    minOrder: {
      type: Number,
      required: true,
      min: 0,
      default: 0, // cents
    },
    deliveryFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0, // cents
    },
    pickup: { type: Boolean, default: true },
    delivery: { type: Boolean, default: true },
    halal: { type: Boolean, default: false },
    catering: { type: Boolean, default: false },
    isOpen: { type: Boolean, default: true },
    hours: { type: String, default: '11:00 - 21:00' },
    timeSlots: {
      type: [String],
      default: ['11:00', '12:00', '17:00', '18:00', '19:00'],
    },
    featured: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'rejected', 'changes_requested'],
      default: 'pending',
      index: true,
    },
    commissionRate: {
      type: Number,
      min: 0,
      max: 50,
      default: undefined,
    },
    ratingAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

restaurantSchema.index({ status: 1, city: 1 });

export const Restaurant = model<IRestaurant>('Restaurant', restaurantSchema);
