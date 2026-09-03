import { Schema, model, type Document, type Types } from 'mongoose';

export type ApplicationStatus = 'pending' | 'changes_requested' | 'approved' | 'rejected';

export interface IRestaurantApplication extends Document {
  applicantUserId: Types.ObjectId;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  businessType: string;
  cuisine: string;
  description: string;
  pickup: boolean;
  delivery: boolean;
  logoUrl: string;
  coverUrl: string;
  status: ApplicationStatus;
  rejectionReason?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  submittedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const restaurantApplicationSchema = new Schema<IRestaurantApplication>(
  {
    applicantUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'applicantUserId is required'],
      index: true,
    },
    businessName: {
      type: String,
      required: [true, 'businessName is required'],
      trim: true,
    },
    ownerName: {
      type: String,
      required: [true, 'ownerName is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'email is required'],
      trim: true,
      lowercase: true,
    },
    phone: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    businessType: { type: String, default: 'Restaurant', trim: true },
    cuisine: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    pickup: { type: Boolean, default: true },
    delivery: { type: Boolean, default: true },
    logoUrl: { type: String, default: '' },
    coverUrl: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'changes_requested', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectionReason: { type: String, default: '', trim: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    submittedDate: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

restaurantApplicationSchema.index({ applicantUserId: 1, status: 1 });

export const RestaurantApplication = model<IRestaurantApplication>(
  'RestaurantApplication',
  restaurantApplicationSchema
);
