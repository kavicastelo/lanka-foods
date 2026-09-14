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

export class MockDeliveryProvider implements IDeliveryProvider {
  async getDeliveryQuote(request: DeliveryQuoteRequest): Promise<DeliveryQuoteResult> {
    // If address contains "out of range" or "unsupported", simulate rejection
    if (request.dropoffAddress.street.toLowerCase().includes('out of range')) {
      return {
        available: false,
        providerCost: 0,
        currency: 'EUR',
        estimatedPickupMinutes: 0,
        estimatedDeliveryMinutes: 0,
        reason: 'Address is outside the Wolt delivery service area.',
      };
    }

    const mockWoltCost = 800; // €8.00 in integer cents
    const now = new Date();
    const deliveryEta = new Date(now.getTime() + 35 * 60 * 1000);

    return {
      available: true,
      providerCost: mockWoltCost,
      currency: 'EUR',
      estimatedPickupMinutes: 15,
      estimatedDeliveryMinutes: 35,
      estimatedDeliveryTime: deliveryEta,
      quoteReference: `wolt_promise_${Date.now()}`,
    };
  }

  async createDelivery(request: CreateDeliveryRequest): Promise<CreateDeliveryResult> {
    if (request.dropoff.address.toLowerCase().includes('simulate_wolt_error')) {
      return {
        success: false,
        deliveryId: '',
        status: 'FAILED',
        rawStatus: 'FAILED',
        providerCost: 0,
        error: 'Simulated Wolt courier dispatch error.',
        errorCode: 'WOLT_UNAVAILABLE',
      };
    }

    const deliveryId = `wolt_mock_del_${Date.now()}`;
    const now = new Date();

    return {
      success: true,
      deliveryId,
      trackingUrl: `https://mock.wolt.com/track/${deliveryId}`,
      status: 'ACCEPTED',
      rawStatus: 'order_accepted',
      providerCost: 800, // €8.00 in integer cents
      pickupEta: new Date(now.getTime() + 15 * 60 * 1000),
      deliveryEta: new Date(now.getTime() + 35 * 60 * 1000),
    };
  }

  async cancelDelivery(_request: CancelDeliveryRequest): Promise<CancelDeliveryResult> {
    return {
      success: true,
      status: 'CANCELLED',
      rawStatus: 'cancelled_by_merchant',
    };
  }

  async getDeliveryStatus(deliveryId: string): Promise<{
    status: InternalDeliveryStatus;
    rawStatus: string;
    trackingUrl?: string;
    deliveryEta?: Date;
  }> {
    return {
      status: 'COURIER_ASSIGNED',
      rawStatus: 'courier_assigned',
      trackingUrl: `https://mock.wolt.com/track/${deliveryId}`,
      deliveryEta: new Date(Date.now() + 25 * 60 * 1000),
    };
  }
}
