import type { InternalDeliveryStatus } from '../../../models/delivery.model.js';

export interface DeliveryQuoteRequest {
  restaurantId: string;
  pickupAddress: {
    street: string;
    city: string;
    postalCode?: string;
    coordinates?: [number, number]; // [longitude, latitude]
    phone?: string;
  };
  dropoffAddress: {
    street: string;
    city: string;
    postalCode?: string;
    coordinates?: [number, number];
    instructions?: string;
    contactPhone?: string;
    contactName?: string;
  };
  orderSubtotal: number; // in cents
}

export interface DeliveryQuoteResult {
  available: boolean;
  providerCost: number; // in cents (merchant cost)
  currency: string;
  estimatedPickupMinutes: number;
  estimatedDeliveryMinutes: number;
  estimatedDeliveryTime?: Date;
  quoteReference?: string;
  reason?: string;
}

export interface CreateDeliveryRequest {
  restaurantId: string;
  orderId: string;
  orderNumber: string;
  pickup: {
    name: string;
    address: string;
    phone: string;
    coordinates?: [number, number];
  };
  dropoff: {
    name: string;
    address: string;
    phone: string;
    instructions?: string;
    coordinates?: [number, number];
  };
  items: Array<{
    name: string;
    count: number;
    price: number; // in cents
  }>;
  orderTotal: number; // in cents
  isCod?: boolean;
  codAmountToCollect?: number; // in cents
  codAmountToExpect?: number; // in cents
}

export interface CreateDeliveryResult {
  success: boolean;
  deliveryId: string;
  trackingUrl?: string;
  status: InternalDeliveryStatus;
  rawStatus: string;
  providerCost: number; // in cents
  pickupEta?: Date;
  deliveryEta?: Date;
  error?: string;
  errorCode?: string;
}

export interface CancelDeliveryRequest {
  restaurantId: string;
  deliveryId: string;
  reason?: string;
}

export interface CancelDeliveryResult {
  success: boolean;
  status: InternalDeliveryStatus;
  rawStatus: string;
  error?: string;
}

export interface IDeliveryProvider {
  getDeliveryQuote(request: DeliveryQuoteRequest): Promise<DeliveryQuoteResult>;
  createDelivery(request: CreateDeliveryRequest): Promise<CreateDeliveryResult>;
  cancelDelivery(request: CancelDeliveryRequest): Promise<CancelDeliveryResult>;
  getDeliveryStatus(deliveryId: string, restaurantId: string): Promise<{
    status: InternalDeliveryStatus;
    rawStatus: string;
    trackingUrl?: string;
    deliveryEta?: Date;
  }>;
}
