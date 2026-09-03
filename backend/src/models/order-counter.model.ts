import { Schema, model } from 'mongoose';

export interface IOrderCounter {
  _id: string; // e.g. 'order_number'
  seq: number;
}

const orderCounterSchema = new Schema<IOrderCounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 10000 },
});

export const OrderCounter = model<IOrderCounter>('OrderCounter', orderCounterSchema);

/**
 * Generates an atomic, sequential, collision-free order number (e.g. 'LE-10001')
 */
export async function generateNextOrderNumber(): Promise<string> {
  const counter = await OrderCounter.findOneAndUpdate(
    { _id: 'order_number' },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return `LE-${counter?.seq ?? 10001}`;
}
