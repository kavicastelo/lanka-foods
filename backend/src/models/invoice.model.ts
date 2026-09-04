import { Schema, model, type Document, type Types } from 'mongoose';

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';

export interface IInvoice extends Document {
  invoiceNumber: string;
  restaurantId: Types.ObjectId;
  restaurantName: string;
  periodStart: Date;
  periodEnd: Date;
  orderCount: number;
  grossSales: number; // in cents
  totalCommission: number; // in cents
  totalServiceFee: number; // in cents
  subscriptionFee: number; // in cents
  totalAmountDue: number; // in cents
  status: InvoiceStatus;
  paymentSlipUrl?: string;
  notes?: string;
  issuedAt: Date;
  paidAt?: Date;
  paidBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'invoiceNumber is required'],
      unique: true,
      index: true,
      trim: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'restaurantId is required'],
      index: true,
    },
    restaurantName: {
      type: String,
      required: [true, 'restaurantName is required'],
      trim: true,
    },
    periodStart: {
      type: Date,
      required: [true, 'periodStart is required'],
    },
    periodEnd: {
      type: Date,
      required: [true, 'periodEnd is required'],
    },
    orderCount: {
      type: Number,
      required: [true, 'orderCount is required'],
      min: 0,
    },
    grossSales: {
      type: Number,
      required: [true, 'grossSales is required'],
      min: 0,
    },
    totalCommission: {
      type: Number,
      required: [true, 'totalCommission is required'],
      min: 0,
    },
    totalServiceFee: {
      type: Number,
      required: [true, 'totalServiceFee is required'],
      min: 0,
    },
    subscriptionFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmountDue: {
      type: Number,
      required: [true, 'totalAmountDue is required'],
      min: 0,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ISSUED', 'PAID', 'CANCELLED'],
      default: 'ISSUED',
      index: true,
    },
    paymentSlipUrl: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    paidBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.index({ restaurantId: 1, status: 1 });
invoiceSchema.index({ periodStart: 1, periodEnd: 1 });

export const Invoice = model<IInvoice>('Invoice', invoiceSchema);
