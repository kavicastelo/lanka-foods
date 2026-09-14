import type {
  CancelDeliveryRequest,
  CancelDeliveryResult,
  CreateDeliveryRequest,
  CreateDeliveryResult,
  DeliveryQuoteRequest,
  DeliveryQuoteResult,
  IDeliveryProvider,
} from './delivery-provider.interface.js';
import type { InternalDeliveryStatus } from '../../../models/delivery.model.js';

export class RestaurantDeliveryProvider implements IDeliveryProvider {
  async getDeliveryQuote(_request: DeliveryQuoteRequest): Promise<DeliveryQuoteResult> {
    const now = new Date();
    return {
      available: true,
      providerCost: 0, // In-house courier has no external provider fee
      currency: 'EUR',
      estimatedPickupMinutes: 15,
      estimatedDeliveryMinutes: 45,
      estimatedDeliveryTime: new Date(now.getTime() + 45 * 60 * 1000),
      quoteReference: `rest_quote_${Date.now()}`,
    };
  }

  async createDelivery(_request: CreateDeliveryRequest): Promise<CreateDeliveryResult> {
    const deliveryId = `rest_del_${Date.now()}`;
    const now = new Date();

    return {
      success: true,
      deliveryId,
      status: 'ACCEPTED',
      rawStatus: 'assigned_in_house',
      providerCost: 0,
      pickupEta: new Date(now.getTime() + 15 * 60 * 1000),
      deliveryEta: new Date(now.getTime() + 45 * 60 * 1000),
    };
  }

  async cancelDelivery(_request: CancelDeliveryRequest): Promise<CancelDeliveryResult> {
    return {
      success: true,
      status: 'CANCELLED',
      rawStatus: 'cancelled_in_house',
    };
  }

  async getDeliveryStatus(_deliveryId: string): Promise<{
    status: InternalDeliveryStatus;
    rawStatus: string;
    trackingUrl?: string;
    deliveryEta?: Date;
  }> {
    return {
      status: 'ACCEPTED',
      rawStatus: 'in_house_delivery',
    };
  }
}
