import { Schema, model, type Document, type Types } from 'mongoose';

export type DeliveryType = 'pickup' | 'delivery';
export type OrderStatus =
  | 'received'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled'
  | 'rejected';
export type PaymentMethod = 'card' | 'mobile' | 'pickup';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export interface IOrderItem {
  menuItemId: Types.ObjectId;
  nameSnapshot: string; // Historical dish name at order placement
  unitPrice: number; // Historical price in cents at order placement
  quantity: number;
  subtotal: number; // Historical line total in cents
  instructions?: string;
}

export interface IStatusHistoryEntry {
  status: OrderStatus;
  changedAt: Date;
  changedBy: Types.ObjectId;
}

export interface IOrder extends Document {
  orderNumber: string; // e.g. "LE-10001" (unique, indexed)
  restaurantId: Types.ObjectId;
  customerId: Types.ObjectId;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryType: DeliveryType;
  status: OrderStatus;
  subtotal: number; // in cents
  deliveryFee: number; // in cents
  serviceFee: number; // in cents
  total: number; // in cents
  scheduledDate: string;
  scheduledTime: string;
  deliveryAddress: string;
  instructions: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  placedAt: Date;
  items: IOrderItem[];
  statusHistory: IStatusHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: [true, 'menuItemId is required for OrderItem'],
    },
    nameSnapshot: {
      type: String,
      required: [true, 'nameSnapshot is required for OrderItem'],
      trim: true,
    },
    unitPrice: {
      type: Number,
      required: [true, 'unitPrice is required for OrderItem'],
      min: 0,
    },
    quantity: {
      type: Number,
      required: [true, 'quantity is required for OrderItem'],
      min: 1,
    },
    subtotal: {
      type: Number,
      required: [true, 'subtotal is required for OrderItem'],
      min: 0,
    },
    instructions: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const statusHistorySchema = new Schema<IStatusHistoryEntry>(
  {
    status: {
      type: String,
      enum: ['received', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled', 'rejected'],
      required: true,
    },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: [true, 'orderNumber is required'],
      unique: true,
      trim: true,
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'restaurantId is required'],
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'customerId is required'],
      index: true,
    },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, default: '', trim: true },
    customerEmail: { type: String, required: true, trim: true, lowercase: true },
    deliveryType: {
      type: String,
      enum: ['pickup', 'delivery'],
      required: true,
    },
    status: {
      type: String,
      enum: ['received', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled', 'rejected'],
      default: 'received',
      index: true,
    },
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    serviceFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    scheduledDate: { type: String, default: '' },
    scheduledTime: { type: String, default: '' },
    deliveryAddress: { type: String, default: '' },
    instructions: { type: String, default: '' },
    paymentMethod: {
      type: String,
      enum: ['card', 'mobile', 'pickup'],
      default: 'pickup',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'failed'],
      default: 'pending',
    },
    placedAt: { type: Date, default: Date.now },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [(val: IOrderItem[]) => val.length > 0, 'Order must contain at least one item'],
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ restaurantId: 1, status: 1 });
orderSchema.index({ customerId: 1, status: 1 });
orderSchema.index({ customerId: 1, placedAt: -1 });

export const Order = model<IOrder>('Order', orderSchema);
