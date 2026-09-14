import { WoltConnection } from '../../../models/delivery.model.js';
import type { InternalDeliveryStatus } from '../../../models/delivery.model.js';
import { decryptToken } from '../../../utils/crypto.js';
import type {
  CancelDeliveryRequest,
  CancelDeliveryResult,
  CreateDeliveryRequest,
  CreateDeliveryResult,
  DeliveryQuoteRequest,
  DeliveryQuoteResult,
  IDeliveryProvider,
} from './delivery-provider.interface.js';
import { WoltApiError, WoltDriveClient } from './wolt-drive.client.js';

export function mapWoltStatusToInternal(woltStatus: string): InternalDeliveryStatus {
  if (!woltStatus) return 'PENDING';
  const clean = woltStatus.toLowerCase().replace(/[-_]/g, '');

  if (clean.includes('created') || clean === 'pending') return 'PENDING';
  if (clean.includes('accept')) return 'ACCEPTED';
  if (clean.includes('courierassigned') || clean.includes('assigned')) return 'COURIER_ASSIGNED';
  if (clean.includes('atpickup') || clean.includes('arrivedatpickup')) return 'AT_PICKUP';
  if (clean.includes('pickedup')) return 'PICKED_UP';
  if (clean.includes('outfordelivery') || clean.includes('transit') || clean.includes('delivering')) return 'OUT_FOR_DELIVERY';
  if (clean.includes('delivered') || clean.includes('completed')) return 'DELIVERED';
  if (clean.includes('cancel')) return 'CANCELLED';
  if (clean.includes('fail') || clean.includes('reject')) return 'FAILED';

  return 'REQUESTED';
}

export class WoltDriveProvider implements IDeliveryProvider {
  private client: WoltDriveClient;

  constructor(env: 'development' | 'production' | 'mock' = 'development') {
    this.client = new WoltDriveClient(env);
  }

  private async getActiveConnection(restaurantId: string) {
    const connection = await WoltConnection.findOne({
      restaurantId,
      status: 'CONNECTED',
    });

    if (!connection) {
      throw new Error('Wolt Drive is not connected for this restaurant.');
    }

    const accessToken = decryptToken(connection.encryptedAccessToken);
    if (!accessToken) {
      throw new Error('Failed to decrypt Wolt credentials for this restaurant.');
    }

    return { connection, accessToken };
  }

  async getDeliveryQuote(request: DeliveryQuoteRequest): Promise<DeliveryQuoteResult> {
    try {
      const { connection, accessToken } = await this.getActiveConnection(request.restaurantId);

      const promiseRes = await this.client.createShipmentPromise(connection.woltVenueId, accessToken, {
        pickup: {
          location: {
            formatted_address: `${request.pickupAddress.street}, ${request.pickupAddress.city}`,
          },
        },
        dropoff: {
          location: {
            formatted_address: `${request.dropoffAddress.street}, ${request.dropoffAddress.city}`,
            coordinates: request.dropoffAddress.coordinates,
          },
        },
      });

      // Extract price in integer cents (e.g. 820 cents = €8.20)
      const costInCents = promiseRes?.price?.amount ?? promiseRes?.fee?.amount ?? 800;
      const currency = promiseRes?.price?.currency || 'EUR';
      const eta = promiseRes?.delivery_eta ? new Date(promiseRes.delivery_eta) : undefined;

      return {
        available: true,
        providerCost: costInCents,
        currency,
        estimatedPickupMinutes: 15,
        estimatedDeliveryMinutes: 35,
        estimatedDeliveryTime: eta,
        quoteReference: promiseRes?.promise_id || promiseRes?.id,
      };
    } catch (err: any) {
      return {
        available: false,
        providerCost: 0,
        currency: 'EUR',
        estimatedPickupMinutes: 0,
        estimatedDeliveryMinutes: 0,
        reason: err.message || 'Wolt delivery quote is currently unavailable.',
      };
    }
  }

  async createDelivery(request: CreateDeliveryRequest): Promise<CreateDeliveryResult> {
    try {
      const { connection, accessToken } = await this.getActiveConnection(request.restaurantId);

      // Construct Wolt venueful delivery payload
      const payload: any = {
        order_reference_id: request.orderNumber,
        pickup: {
          location: { formatted_address: request.pickup.address },
          comment: 'Pick up at restaurant counter',
          contact_details: {
            name: request.pickup.name,
            phone_number: request.pickup.phone,
          },
        },
        dropoff: {
          location: {
            formatted_address: request.dropoff.address,
            coordinates: request.dropoff.coordinates,
          },
          comment: request.dropoff.instructions || '',
          contact_details: {
            name: request.dropoff.name,
            phone_number: request.dropoff.phone,
          },
        },
        contents: request.items.map((i) => ({
          count: i.count,
          description: i.name,
          identifier: i.name,
          tags: [],
        })),
      };

      // COD cash amount specification if enabled
      if (request.isCod && request.codAmountToCollect && request.codAmountToCollect > 0) {
        payload.cash = {
          amount_to_collect: {
            amount: request.codAmountToCollect,
            currency: 'EUR',
          },
          ...(request.codAmountToExpect
            ? {
                amount_to_expect: {
                  amount: request.codAmountToExpect,
                  currency: 'EUR',
                },
              }
            : {}),
        };
      }

      const res = await this.client.createDelivery(connection.woltVenueId, accessToken, payload);

      const rawStatus = res?.status || 'created';
      const internalStatus = mapWoltStatusToInternal(rawStatus);
      const deliveryId = res?.wolt_order_reference_id || res?.delivery_id || res?.id || `wolt_${Date.now()}`;
      const trackingUrl = res?.tracking?.url || res?.tracking_url || '';
      const cost = res?.fee?.amount || res?.price?.amount || 800;

      return {
        success: true,
        deliveryId,
        trackingUrl,
        status: internalStatus,
        rawStatus,
        providerCost: cost,
        pickupEta: res?.pickup_eta ? new Date(res.pickup_eta) : undefined,
        deliveryEta: res?.delivery_eta ? new Date(res.delivery_eta) : undefined,
      };
    } catch (err: any) {
      const isWoltApiError = err instanceof WoltApiError;
      return {
        success: false,
        deliveryId: '',
        status: 'FAILED',
        rawStatus: err?.rawDetails?.status || 'failed',
        providerCost: 0,
        error: err.message || 'Failed to create Wolt delivery order.',
        errorCode: isWoltApiError ? err.errorCode : 'WOLT_UNKNOWN_ERROR',
      };
    }
  }

  async cancelDelivery(request: CancelDeliveryRequest): Promise<CancelDeliveryResult> {
    try {
      const { connection, accessToken } = await this.getActiveConnection(request.restaurantId);
      const res = await this.client.cancelDelivery(connection.woltVenueId, request.deliveryId, accessToken, request.reason);

      const rawStatus = res?.status || 'cancelled';
      return {
        success: true,
        status: mapWoltStatusToInternal(rawStatus),
        rawStatus,
      };
    } catch (err: any) {
      return {
        success: false,
        status: 'FAILED',
        rawStatus: 'cancellation_failed',
        error: err.message || 'Wolt rejected delivery cancellation.',
      };
    }
  }

  async getDeliveryStatus(deliveryId: string, restaurantId: string): Promise<{
    status: InternalDeliveryStatus;
    rawStatus: string;
    trackingUrl?: string;
    deliveryEta?: Date;
  }> {
    const { connection, accessToken } = await this.getActiveConnection(restaurantId);
    const res = await this.client.getDelivery(connection.woltVenueId, deliveryId, accessToken);

    const rawStatus = res?.status || 'unknown';
    return {
      status: mapWoltStatusToInternal(rawStatus),
      rawStatus,
      trackingUrl: res?.tracking?.url || res?.tracking_url,
      deliveryEta: res?.delivery_eta ? new Date(res.delivery_eta) : undefined,
    };
  }
}
