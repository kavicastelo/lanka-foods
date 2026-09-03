import { Schema, model, type Document, type Types } from 'mongoose';

export type SettlementStatus = 'PENDING' | 'SETTLED' | 'VOID';

export interface IFinancialRecord extends Document {
  orderId: Types.ObjectId;
  orderNumber: string;
  restaurantId: Types.ObjectId;
  customerId: Types.ObjectId;
  orderSubtotal: number; // in cents
  deliveryFee: number; // in cents
  orderTotal: number; // in cents
  commissionableAmount: number; // in cents (base amount on which commission was calculated)
  commissionRate: number; // rate percentage snapshot (e.g. 10 for 10%)
  commissionAmount: number; // in cents (calculated platform commission)
  restaurantNetAmount: number; // in cents (net earnings owed to restaurant)
  status: SettlementStatus;
  settledAt?: Date;
  settledBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const financialRecordSchema = new Schema<IFinancialRecord>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'orderId is required'],
      unique: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: [true, 'orderNumber is required'],
      trim: true,
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
    orderSubtotal: {
      type: Number,
      required: [true, 'orderSubtotal is required'],
      min: 0,
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    orderTotal: {
      type: Number,
      required: [true, 'orderTotal is required'],
      min: 0,
    },
    commissionableAmount: {
      type: Number,
      required: [true, 'commissionableAmount is required'],
      min: 0,
    },
    commissionRate: {
      type: Number,
      required: [true, 'commissionRate is required'],
      min: 0,
      max: 100,
    },
    commissionAmount: {
      type: Number,
      required: [true, 'commissionAmount is required'],
      min: 0,
    },
    restaurantNetAmount: {
      type: Number,
      required: [true, 'restaurantNetAmount is required'],
      min: 0,
    },
    status: {
      type: String,
      enum: ['PENDING', 'SETTLED', 'VOID'],
      default: 'PENDING',
      index: true,
    },
    settledAt: {
      type: Date,
      default: null,
    },
    settledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

financialRecordSchema.index({ restaurantId: 1, status: 1 });
financialRecordSchema.index({ createdAt: -1 });

export const FinancialRecord = model<IFinancialRecord>('FinancialRecord', financialRecordSchema);
