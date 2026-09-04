import mongoose, { Schema, type Document } from 'mongoose';

export type NotificationType =
  | 'ORDER_STATUS'
  | 'NEW_ORDER'
  | 'INVOICE_ISSUED'
  | 'PAYMENT_SLIP_UPLOADED'
  | 'APPLICATION_APPROVED'
  | 'APPLICATION_REJECTED'
  | 'NEW_REVIEW'
  | 'SYSTEM';

export interface INotification extends Document {
  userId?: mongoose.Types.ObjectId;
  role?: 'CUSTOMER' | 'RESTAURANT_ADMIN' | 'SUPER_ADMIN';
  restaurantId?: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    role: {
      type: String,
      enum: ['CUSTOMER', 'RESTAURANT_ADMIN', 'SUPER_ADMIN'],
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'ORDER_STATUS',
        'NEW_ORDER',
        'INVOICE_ISSUED',
        'PAYMENT_SLIP_UPLOADED',
        'APPLICATION_APPROVED',
        'APPLICATION_REJECTED',
        'NEW_REVIEW',
        'SYSTEM',
      ],
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      default: '',
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ role: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ restaurantId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
