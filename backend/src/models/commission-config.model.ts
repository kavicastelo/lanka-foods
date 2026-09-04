import { Schema, model, type Document, type Types } from 'mongoose';

export interface ICommissionConfig extends Document {
  key: string;
  defaultRate: number; // Percentage value between 0 and 50 (e.g. 10)
  serviceFee: number; // Stored in integer cents, e.g. 99 for €0.99
  updatedBy?: Types.ObjectId;
  updatedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const commissionConfigSchema = new Schema<ICommissionConfig>(
  {
    key: {
      type: String,
      default: 'default_config',
      unique: true,
    },
    defaultRate: {
      type: Number,
      required: [true, 'defaultRate is required'],
      min: 0,
      max: 50,
      default: 10,
    },
    serviceFee: {
      type: Number,
      min: 0,
      default: 99,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const CommissionConfig = model<ICommissionConfig>('CommissionConfig', commissionConfigSchema);
