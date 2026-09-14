import { Schema, model, type Document, type Types } from 'mongoose';

export type RestaurantStatus = 'pending' | 'active' | 'suspended' | 'rejected' | 'changes_requested';
export type PriceRange = '€' | '€€' | '€€€';
export type ScheduleType = '24_7' | '24_5' | '24_weekends' | 'custom_hours' | 'custom_dates';

export interface IDaySchedule {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface IWeeklySchedule {
  monday: IDaySchedule;
  tuesday: IDaySchedule;
  wednesday: IDaySchedule;
  thursday: IDaySchedule;
  friday: IDaySchedule;
  saturday: IDaySchedule;
  sunday: IDaySchedule;
}

export interface ICustomDateSchedule {
  date: string; // YYYY-MM-DD
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  note?: string;
}

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
  scheduleType: ScheduleType;
  weeklySchedule?: IWeeklySchedule;
  customDates?: ICustomDateSchedule[];
  timeSlots: string[];
  featured: boolean;
  status: RestaurantStatus;
  commissionRate?: number; // optional percentage override
  ratingAverage: number; // e.g. 4.5
  reviewCount: number; // e.g. 12
  createdAt: Date;
  updatedAt: Date;
}

const defaultDaySchedule: IDaySchedule = {
  isOpen: true,
  openTime: '11:00',
  closeTime: '21:00',
};

export const defaultWeeklySchedule: IWeeklySchedule = {
  monday: { ...defaultDaySchedule },
  tuesday: { ...defaultDaySchedule },
  wednesday: { ...defaultDaySchedule },
  thursday: { ...defaultDaySchedule },
  friday: { ...defaultDaySchedule },
  saturday: { ...defaultDaySchedule },
  sunday: { ...defaultDaySchedule },
};

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
    scheduleType: {
      type: String,
      enum: ['24_7', '24_5', '24_weekends', 'custom_hours', 'custom_dates'],
      default: 'custom_hours',
    },
    weeklySchedule: {
      type: {
        monday: { isOpen: Boolean, openTime: String, closeTime: String },
        tuesday: { isOpen: Boolean, openTime: String, closeTime: String },
        wednesday: { isOpen: Boolean, openTime: String, closeTime: String },
        thursday: { isOpen: Boolean, openTime: String, closeTime: String },
        friday: { isOpen: Boolean, openTime: String, closeTime: String },
        saturday: { isOpen: Boolean, openTime: String, closeTime: String },
        sunday: { isOpen: Boolean, openTime: String, closeTime: String },
      },
      default: () => ({ ...defaultWeeklySchedule }),
    },
    customDates: {
      type: [
        {
          date: { type: String, required: true },
          isOpen: { type: Boolean, default: false },
          openTime: { type: String, default: '' },
          closeTime: { type: String, default: '' },
          note: { type: String, default: '' },
        },
      ],
      default: [],
    },
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
