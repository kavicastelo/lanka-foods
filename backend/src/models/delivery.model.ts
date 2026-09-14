import { Schema, model, type Document, type Types } from 'mongoose';

export type DeliveryProviderType = 'NONE' | 'RESTAURANT' | 'WOLT' | 'MOCK';

export type PricingStrategy =
  | 'FIXED'
  | 'FREE'
  | 'WOLT_COST'
  | 'WOLT_COST_MARKUP'
  | 'PERCENTAGE_MARKUP'
  | 'DISTANCE_BASED'
  | 'FREE_OVER_THRESHOLD';

export type WoltConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'EXPIRED' | 'REVOKED';

export type InternalDeliveryStatus =
  | 'PENDING'
  | 'QUOTED'
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'COURIER_ASSIGNED'
  | 'AT_PICKUP'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED';

export interface IDistanceTier {
  maxKm: number;
  fee: number; // in cents
}

export interface IPricingParams {
  fixedFee?: number; // in cents (e.g. 500 = €5.00)
  markupFee?: number; // in cents (e.g. 150 = €1.50)
  percentageMultiplier?: number; // e.g. 1.15 = 15% markup
  freeDeliveryThreshold?: number; // in cents (e.g. 5000 = €50.00)
  distanceTiers?: IDistanceTier[];
  fallbackFee?: number; // in cents
}

// -------------------------------------------------------------
// 1. Restaurant Delivery Settings
// -------------------------------------------------------------
export interface IDeliverySettings extends Document {
  restaurantId: Types.ObjectId;
  deliveryEnabled: boolean;
  deliveryProvider: DeliveryProviderType;
  woltEnabled: boolean;
  pricingStrategy: PricingStrategy;
  pricingParams: IPricingParams;
  maxDistanceKm?: number;
  codEnabled: boolean;
  customerFeeVisibility: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const distanceTierSchema = new Schema<IDistanceTier>(
  {
    maxKm: { type: Number, required: true, min: 0 },
    fee: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const pricingParamsSchema = new Schema<IPricingParams>(
  {
    fixedFee: { type: Number, default: 490, min: 0 },
    markupFee: { type: Number, default: 0, min: 0 },
    percentageMultiplier: { type: Number, default: 1.0, min: 0 },
    freeDeliveryThreshold: { type: Number, default: 5000, min: 0 },
    distanceTiers: { type: [distanceTierSchema], default: [] },
    fallbackFee: { type: Number, default: 590, min: 0 },
  },
  { _id: false }
);

const deliverySettingsSchema = new Schema<IDeliverySettings>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      unique: true,
      index: true,
    },
    deliveryEnabled: { type: Boolean, default: true },
    deliveryProvider: {
      type: String,
      enum: ['NONE', 'RESTAURANT', 'WOLT', 'MOCK'],
      default: 'RESTAURANT',
    },
    woltEnabled: { type: Boolean, default: false },
    pricingStrategy: {
      type: String,
      enum: [
        'FIXED',
        'FREE',
        'WOLT_COST',
        'WOLT_COST_MARKUP',
        'PERCENTAGE_MARKUP',
        'DISTANCE_BASED',
        'FREE_OVER_THRESHOLD',
      ],
      default: 'FIXED',
    },
    pricingParams: {
      type: pricingParamsSchema,
      default: () => ({
        fixedFee: 490,
        markupFee: 0,
        percentageMultiplier: 1.0,
        freeDeliveryThreshold: 5000,
        distanceTiers: [],
        fallbackFee: 590,
      }),
    },
    maxDistanceKm: { type: Number, default: 10, min: 0 },
    codEnabled: { type: Boolean, default: false },
    customerFeeVisibility: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const DeliverySettings = model<IDeliverySettings>('DeliverySettings', deliverySettingsSchema);

// -------------------------------------------------------------
// 2. Wolt Connection (Tenant-Isolated & Encrypted Credentials)
// -------------------------------------------------------------
export interface IWoltConnection extends Document {
  restaurantId: Types.ObjectId;
  woltMerchantId?: string;
  woltVenueId: string;
  woltVenueName?: string;
  encryptedAccessToken: string;
  encryptedRefreshToken?: string;
  tokenExpiry?: Date;
  status: WoltConnectionStatus;
  lastSyncAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const woltConnectionSchema = new Schema<IWoltConnection>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      unique: true,
      index: true,
    },
    woltMerchantId: { type: String, default: '', trim: true },
    woltVenueId: { type: String, required: true, trim: true },
    woltVenueName: { type: String, default: '', trim: true },
    encryptedAccessToken: { type: String, required: true },
    encryptedRefreshToken: { type: String, default: '' },
    tokenExpiry: { type: Date },
    status: {
      type: String,
      enum: ['CONNECTED', 'DISCONNECTED', 'EXPIRED', 'REVOKED'],
      default: 'CONNECTED',
      index: true,
    },
    lastSyncAt: { type: Date, default: Date.now },
    lastError: { type: String, default: '' },
  },
  { timestamps: true }
);

export const WoltConnection = model<IWoltConnection>('WoltConnection', woltConnectionSchema);

// -------------------------------------------------------------
// 3. Delivery Record (Orders ↔ Delivery Dispatch Lifecycle)
// -------------------------------------------------------------
export interface IDelivery extends Document {
  orderId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  customerId: Types.ObjectId;
  provider: DeliveryProviderType;
  deliveryStatus: InternalDeliveryStatus;
  rawProviderStatus: string;
  woltDeliveryId?: string;
  woltOrderReference: string;
  trackingUrl?: string;
  pickupEta?: Date;
  deliveryEta?: Date;
  woltDeliveryCost: number; // in cents (Wolt merchant fee charged to restaurant)
  customerDeliveryFee: number; // in cents (Fee charged to customer by restaurant)
  pricingStrategy: string;
  pricingSnapshot: Record<string, any>;
  isCod: boolean;
  codAmountToCollect: number; // in cents
  codAmountToExpect: number; // in cents
  errorDetails?: string;
  createdAt: Date;
  updatedAt: Date;
}

const deliverySchema = new Schema<IDelivery>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['NONE', 'RESTAURANT', 'WOLT', 'MOCK'],
      required: true,
    },
    deliveryStatus: {
      type: String,
      enum: [
        'PENDING',
        'QUOTED',
        'REQUESTED',
        'ACCEPTED',
        'COURIER_ASSIGNED',
        'AT_PICKUP',
        'PICKED_UP',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED',
        'FAILED',
      ],
      default: 'PENDING',
      index: true,
    },
    rawProviderStatus: { type: String, default: 'PENDING' },
    woltDeliveryId: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
      index: true,
    },
    woltOrderReference: { type: String, required: true, trim: true },
    trackingUrl: { type: String, default: '' },
    pickupEta: { type: Date },
    deliveryEta: { type: Date },
    woltDeliveryCost: { type: Number, default: 0, min: 0 },
    customerDeliveryFee: { type: Number, default: 0, min: 0 },
    pricingStrategy: { type: String, default: 'FIXED' },
    pricingSnapshot: { type: Schema.Types.Mixed, default: {} },
    isCod: { type: Boolean, default: false },
    codAmountToCollect: { type: Number, default: 0, min: 0 },
    codAmountToExpect: { type: Number, default: 0, min: 0 },
    errorDetails: { type: String, default: '' },
  },
  { timestamps: true }
);

deliverySchema.index({ restaurantId: 1, deliveryStatus: 1 });
deliverySchema.index({ createdAt: -1 });

export const Delivery = model<IDelivery>('Delivery', deliverySchema);

// -------------------------------------------------------------
// 4. Webhook Idempotency Event Store
// -------------------------------------------------------------
export interface IDeliveryWebhookEvent extends Document {
  eventId: string;
  provider: string;
  eventType: string;
  payload: Record<string, any>;
  processed: boolean;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const deliveryWebhookEventSchema = new Schema<IDeliveryWebhookEvent>(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    provider: { type: String, default: 'WOLT' },
    eventType: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    processed: { type: Boolean, default: false },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

export const DeliveryWebhookEvent = model<IDeliveryWebhookEvent>(
  'DeliveryWebhookEvent',
  deliveryWebhookEventSchema
);
