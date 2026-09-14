import { Types } from 'mongoose';
import {
  Delivery,
  DeliverySettings,
  DeliveryWebhookEvent,
  WoltConnection,
  type PricingStrategy,
} from '../../models/delivery.model.js';
import { Order } from '../../models/order.model.js';
import { Restaurant } from '../../models/restaurant.model.js';
import { encryptToken, generateOAuthState, verifyOAuthState, verifyWebhookSignature } from '../../utils/crypto.js';
import { DeliveryPricingEngine } from './pricing/pricing-engine.js';
import { DeliveryProviderFactory } from './providers/delivery-provider.factory.js';
import { mapWoltStatusToInternal } from './providers/wolt-drive.provider.js';
import { NotificationService } from '../notifications/notification.service.js';

export interface UpdateDeliverySettingsInput {
  deliveryEnabled?: boolean;
  deliveryProvider?: 'NONE' | 'RESTAURANT' | 'WOLT' | 'MOCK';
  woltEnabled?: boolean;
  pricingStrategy?: PricingStrategy;
  pricingParams?: {
    fixedFee?: number;
    markupFee?: number;
    percentageMultiplier?: number;
    freeDeliveryThreshold?: number;
    distanceTiers?: Array<{ maxKm: number; fee: number }>;
    fallbackFee?: number;
  };
  maxDistanceKm?: number;
  codEnabled?: boolean;
  customerFeeVisibility?: boolean;
}

export class DeliveryService {
  /**
   * Retrieves or initializes delivery settings for a given restaurant.
   * Also bundles safe connection status (without exposing secrets).
   */
  static async getDeliverySettings(restaurantId: string) {
    let settings = await DeliverySettings.findOne({ restaurantId });
    if (!settings) {
      settings = await DeliverySettings.create({
        restaurantId,
        deliveryEnabled: true,
        deliveryProvider: 'RESTAURANT',
        woltEnabled: false,
        pricingStrategy: 'FIXED',
        pricingParams: {
          fixedFee: 490,
          markupFee: 0,
          percentageMultiplier: 1.0,
          freeDeliveryThreshold: 5000,
          distanceTiers: [
            { maxKm: 3, fee: 390 },
            { maxKm: 6, fee: 590 },
            { maxKm: 10, fee: 890 },
          ],
          fallbackFee: 590,
        },
        maxDistanceKm: 10,
        codEnabled: false,
        customerFeeVisibility: true,
      });
    }

    const woltConnection = await WoltConnection.findOne({ restaurantId });

    return {
      settings: {
        deliveryEnabled: settings.deliveryEnabled,
        deliveryProvider: settings.deliveryProvider,
        woltEnabled: settings.woltEnabled,
        pricingStrategy: settings.pricingStrategy,
        pricingParams: settings.pricingParams,
        maxDistanceKm: settings.maxDistanceKm,
        codEnabled: settings.codEnabled,
        customerFeeVisibility: settings.customerFeeVisibility,
      },
      woltConnection: woltConnection
        ? {
            status: woltConnection.status,
            woltVenueId: woltConnection.woltVenueId,
            woltVenueName: woltConnection.woltVenueName,
            woltMerchantId: woltConnection.woltMerchantId,
            lastSyncAt: woltConnection.lastSyncAt,
            hasValidToken: !!woltConnection.encryptedAccessToken && woltConnection.status === 'CONNECTED',
          }
        : {
            status: 'DISCONNECTED',
            woltVenueId: '',
            hasValidToken: false,
          },
    };
  }

  /**
   * Updates restaurant delivery settings with strict validation.
   */
  static async updateDeliverySettings(restaurantId: string, input: UpdateDeliverySettingsInput) {
    let settings = await DeliverySettings.findOne({ restaurantId });
    if (!settings) {
      settings = new DeliverySettings({ restaurantId });
    }

    if (input.deliveryEnabled !== undefined) settings.deliveryEnabled = input.deliveryEnabled;
    if (input.deliveryProvider !== undefined) settings.deliveryProvider = input.deliveryProvider;
    if (input.woltEnabled !== undefined) settings.woltEnabled = input.woltEnabled;
    if (input.pricingStrategy !== undefined) settings.pricingStrategy = input.pricingStrategy;

    if (input.pricingParams) {
      settings.pricingParams = {
        fixedFee: Math.max(0, input.pricingParams.fixedFee ?? settings.pricingParams?.fixedFee ?? 490),
        markupFee: Math.max(0, input.pricingParams.markupFee ?? settings.pricingParams?.markupFee ?? 0),
        percentageMultiplier:
          input.pricingParams.percentageMultiplier !== undefined && input.pricingParams.percentageMultiplier > 0
            ? input.pricingParams.percentageMultiplier
            : (settings.pricingParams?.percentageMultiplier ?? 1.0),
        freeDeliveryThreshold: Math.max(
          0,
          input.pricingParams.freeDeliveryThreshold ?? settings.pricingParams?.freeDeliveryThreshold ?? 5000
        ),
        distanceTiers: input.pricingParams.distanceTiers || settings.pricingParams?.distanceTiers || [],
        fallbackFee: Math.max(0, input.pricingParams.fallbackFee ?? settings.pricingParams?.fallbackFee ?? 590),
      };
    }

    if (input.maxDistanceKm !== undefined) settings.maxDistanceKm = Math.max(0, input.maxDistanceKm);
    if (input.codEnabled !== undefined) settings.codEnabled = input.codEnabled;
    if (input.customerFeeVisibility !== undefined) settings.customerFeeVisibility = input.customerFeeVisibility;

    await settings.save();
    return this.getDeliverySettings(restaurantId);
  }

  /**
   * Generates a secure Wolt onboarding authorization URL with CSRF protection.
   */
  static async initiateWoltConnect(restaurantId: string) {
    const clientId = process.env.WOLT_CLIENT_ID || 'wolt_client_id_demo';
    const redirectUri = process.env.WOLT_REDIRECT_URI || 'http://localhost:4000/api/delivery/wolt/callback';
    const state = generateOAuthState(restaurantId);

    const woltAuthBase =
      process.env.WOLT_ENVIRONMENT === 'production'
        ? 'https://authentication.wolt.com/oauth2/authorize'
        : 'https://authentication.development.dev.wolt.com/oauth2/authorize';

    const authUrl = `${woltAuthBase}?response_type=code&client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&scope=drive:delivery`;

    return {
      authUrl,
      state,
    };
  }

  /**
   * Completes OAuth onboarding callback, safely storing encrypted tokens.
   */
  static async handleWoltOAuthCallback(_code: string, state: string, venueId?: string, venueName?: string) {
    const stateCheck = verifyOAuthState(state);
    if (!stateCheck.valid || !stateCheck.restaurantId) {
      const error = new Error(`Invalid or expired OAuth state: ${stateCheck.error}`) as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    const restaurantId = stateCheck.restaurantId;
    const resolvedVenueId = venueId || `venue_${restaurantId.slice(-6)}`;
    const resolvedVenueName = venueName || `Venue ${resolvedVenueId}`;

    // Token simulation or exchange with Wolt OAuth
    const mockAccessToken = `wolt_access_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const mockRefreshToken = `wolt_refresh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const encryptedAccessToken = encryptToken(mockAccessToken);
    const encryptedRefreshToken = encryptToken(mockRefreshToken);
    const tokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    let connection = await WoltConnection.findOne({ restaurantId });
    if (!connection) {
      connection = new WoltConnection({
        restaurantId,
        woltVenueId: resolvedVenueId,
        woltVenueName: resolvedVenueName,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiry,
        status: 'CONNECTED',
        lastSyncAt: new Date(),
      });
    } else {
      connection.woltVenueId = resolvedVenueId;
      connection.woltVenueName = resolvedVenueName;
      connection.encryptedAccessToken = encryptedAccessToken;
      connection.encryptedRefreshToken = encryptedRefreshToken;
      connection.tokenExpiry = tokenExpiry;
      connection.status = 'CONNECTED';
      connection.lastSyncAt = new Date();
      connection.lastError = '';
    }
    await connection.save();

    // Enable Wolt in delivery settings
    await DeliverySettings.findOneAndUpdate(
      { restaurantId },
      { $set: { woltEnabled: true, deliveryProvider: 'WOLT' } },
      { upsert: true }
    );

    return {
      success: true,
      restaurantId,
      woltVenueId: resolvedVenueId,
      status: 'CONNECTED',
    };
  }

  /**
   * Disconnects Wolt Drive while preserving historical delivery records.
   */
  static async disconnectWolt(restaurantId: string) {
    await WoltConnection.findOneAndUpdate(
      { restaurantId },
      { $set: { status: 'DISCONNECTED', lastSyncAt: new Date() } }
    );

    await DeliverySettings.findOneAndUpdate(
      { restaurantId },
      { $set: { woltEnabled: false, deliveryProvider: 'RESTAURANT' } }
    );

    return {
      success: true,
      message: 'Wolt Drive disconnected successfully. Historical deliveries are preserved.',
    };
  }

  /**
   * Calculates delivery fee and availability for customer checkout in real-time.
   */
  static async calculateCheckoutDeliveryQuote(
    restaurantId: string,
    dropoffAddress: string,
    orderSubtotal: number
  ) {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    const { settings, woltConnection } = await this.getDeliverySettings(restaurantId);

    // 1. Check if restaurant offers delivery at all
    if (!settings.deliveryEnabled || !restaurant.delivery) {
      return {
        available: false,
        reason: 'This restaurant does not currently offer delivery.',
        customerDeliveryFee: 0,
        woltDeliveryCost: 0,
      };
    }

    const providerType = settings.deliveryProvider;

    // 2. Check Wolt connection if Wolt is chosen
    if (providerType === 'WOLT') {
      if (woltConnection.status !== 'CONNECTED') {
        return {
          available: false,
          reason: 'Wolt Drive delivery is currently disconnected for this restaurant.',
          customerDeliveryFee: 0,
          woltDeliveryCost: 0,
        };
      }
    }

    const provider = DeliveryProviderFactory.getProvider(providerType);
    const quoteResult = await provider.getDeliveryQuote({
      restaurantId,
      pickupAddress: {
        street: restaurant.address || 'Central St 1',
        city: restaurant.city || 'Helsinki',
      },
      dropoffAddress: {
        street: dropoffAddress,
        city: restaurant.city || 'Helsinki',
      },
      orderSubtotal,
    });

    if (!quoteResult.available) {
      return {
        available: false,
        reason: quoteResult.reason || 'Address is outside available delivery service area.',
        customerDeliveryFee: 0,
        woltDeliveryCost: 0,
      };
    }

    // 3. Compute customer delivery fee via Server-Authoritative Pricing Engine
    const pricingResult = DeliveryPricingEngine.calculateCustomerDeliveryFee({
      orderSubtotal,
      woltDeliveryCost: quoteResult.providerCost,
      settings: {
        pricingStrategy: settings.pricingStrategy,
        pricingParams: settings.pricingParams,
        maxDistanceKm: settings.maxDistanceKm,
      },
    });

    return {
      available: true,
      customerDeliveryFee: pricingResult.customerDeliveryFee,
      woltDeliveryCost: pricingResult.woltDeliveryCost,
      pricingStrategy: pricingResult.pricingStrategy,
      appliedRule: pricingResult.appliedRule,
      isFreeDelivery: pricingResult.isFreeDelivery,
      estimatedDeliveryMinutes: quoteResult.estimatedDeliveryMinutes,
      estimatedPickupMinutes: quoteResult.estimatedPickupMinutes,
      estimatedDeliveryTime: quoteResult.estimatedDeliveryTime,
      provider: providerType,
    };
  }

  /**
   * Dispatches an order to the active delivery provider with idempotency protection.
   */
  static async dispatchOrderDelivery(orderId: string, actorUserId: string, actorRole: string) {
    const order = await Order.findById(orderId);
    if (!order) {
      const err = new Error('Order not found') as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    // Tenant Authorization Check
    if (actorRole === 'RESTAURANT_ADMIN') {
      const adminRestaurant = await Restaurant.findOne({ ownerId: actorUserId });
      if (!adminRestaurant || adminRestaurant._id.toString() !== order.restaurantId.toString()) {
        const err = new Error('Unauthorized to dispatch deliveries for this restaurant.') as Error & {
          statusCode?: number;
        };
        err.statusCode = 403;
        throw err;
      }
    }

    // Idempotency: Prevent duplicate dispatch requests (Section 24)
    const existingDelivery = await Delivery.findOne({ orderId: order._id });
    if (existingDelivery && existingDelivery.deliveryStatus !== 'FAILED') {
      return {
        success: true,
        delivery: existingDelivery,
        message: 'Delivery was already created for this order.',
      };
    }

    const restaurant = await Restaurant.findById(order.restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    const { settings, woltConnection } = await this.getDeliverySettings(order.restaurantId.toString());
    const providerType = settings.deliveryProvider;

    if (providerType === 'WOLT' && woltConnection.status !== 'CONNECTED') {
      const err = new Error('Wolt Drive is disconnected for this restaurant.') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    // COD check
    const isCod = order.paymentMethod === 'cash_on_delivery';
    if (isCod && !settings.codEnabled) {
      const err = new Error('Cash on Delivery (COD) is not enabled for this restaurant.') as Error & {
        statusCode?: number;
      };
      err.statusCode = 400;
      throw err;
    }

    const provider = DeliveryProviderFactory.getProvider(providerType);
    const createResult = await provider.createDelivery({
      restaurantId: order.restaurantId.toString(),
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      pickup: {
        name: restaurant.name,
        address: `${restaurant.address}, ${restaurant.city}`,
        phone: restaurant.phone || '+358400000000',
      },
      dropoff: {
        name: order.customerName,
        address: order.deliveryAddress,
        phone: order.customerPhone || '+358400000000',
        instructions: order.instructions,
      },
      items: order.items.map((i) => ({
        name: i.nameSnapshot,
        count: i.quantity,
        price: i.unitPrice,
      })),
      orderTotal: order.total,
      isCod,
      codAmountToCollect: isCod ? order.total : undefined,
    });

    if (!createResult.success) {
      const err = new Error(createResult.error || 'Failed to dispatch delivery to provider.') as Error & {
        statusCode?: number;
      };
      err.statusCode = 400;
      throw err;
    }

    // Persist Delivery record
    const deliveryRecord = await Delivery.create({
      orderId: order._id,
      restaurantId: order.restaurantId,
      customerId: order.customerId,
      provider: providerType,
      deliveryStatus: createResult.status,
      rawProviderStatus: createResult.rawStatus,
      woltDeliveryId: createResult.deliveryId,
      woltOrderReference: order.orderNumber,
      trackingUrl: createResult.trackingUrl || '',
      pickupEta: createResult.pickupEta,
      deliveryEta: createResult.deliveryEta,
      woltDeliveryCost: createResult.providerCost,
      customerDeliveryFee: order.deliveryFee,
      pricingStrategy: settings.pricingStrategy,
      isCod,
      codAmountToCollect: isCod ? order.total : 0,
    });

    // Update order with delivery link and tracking URL
    order.deliveryProvider = providerType;
    order.deliveryId = deliveryRecord._id as Types.ObjectId;
    order.woltDeliveryCost = createResult.providerCost;
    order.trackingUrl = createResult.trackingUrl || '';
    if (order.status === 'ready' || order.status === 'accepted') {
      order.status = 'out_for_delivery';
      order.statusHistory.push({
        status: 'out_for_delivery',
        changedAt: new Date(),
        changedBy: new Types.ObjectId(actorUserId),
        note: `Dispatched via ${providerType} (${deliveryRecord.woltDeliveryId})`,
      });
    }
    await order.save();

    // Customer Notification
    await NotificationService.createNotification({
      userId: order.customerId,
      role: 'CUSTOMER',
      type: 'ORDER_STATUS',
      title: `Order #${order.orderNumber} Dispatched!`,
      message: `Your delivery has been dispatched via ${providerType}. Track courier in real-time.`,
      link: `/order/${order._id}`,
      metadata: { orderId: order._id.toString(), trackingUrl: createResult.trackingUrl },
    }).catch(() => {});

    return {
      success: true,
      delivery: deliveryRecord,
      order,
    };
  }

  /**
   * Cancels a dispatched delivery where allowed.
   */
  static async cancelOrderDelivery(orderId: string, actorUserId: string, actorRole: string, reason?: string) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (actorRole === 'RESTAURANT_ADMIN') {
      const adminRestaurant = await Restaurant.findOne({ ownerId: actorUserId });
      if (!adminRestaurant || adminRestaurant._id.toString() !== order.restaurantId.toString()) {
        const err = new Error('Unauthorized to cancel delivery for this restaurant.') as Error & {
          statusCode?: number;
        };
        err.statusCode = 403;
        throw err;
      }
    }

    const delivery = await Delivery.findOne({ orderId: order._id });
    if (!delivery) {
      throw new Error('No delivery record found for this order.');
    }

    const provider = DeliveryProviderFactory.getProvider(delivery.provider);
    const cancelRes = await provider.cancelDelivery({
      restaurantId: order.restaurantId.toString(),
      deliveryId: delivery.woltDeliveryId || '',
      reason,
    });

    if (!cancelRes.success) {
      throw new Error(cancelRes.error || 'Provider rejected delivery cancellation.');
    }

    delivery.deliveryStatus = 'CANCELLED';
    delivery.rawProviderStatus = cancelRes.rawStatus;
    await delivery.save();

    return {
      success: true,
      delivery,
    };
  }

  /**
   * Idempotent Wolt webhook processor.
   */
  static async handleWoltWebhook(signatureHeader: string | undefined, rawPayload: string | Buffer) {
    const webhookSecret = process.env.WOLT_WEBHOOK_SECRET || 'wolt_webhook_secret_demo';

    // 1. Verify signature if webhook secret is configured and not in test bypass
    if (process.env.WOLT_ENVIRONMENT === 'production' || signatureHeader) {
      const validSig = verifyWebhookSignature(rawPayload, signatureHeader, webhookSecret);
      if (!validSig) {
        const error = new Error('Invalid Wolt webhook signature') as Error & { statusCode?: number };
        error.statusCode = 401;
        throw error;
      }
    }

    const payloadString = typeof rawPayload === 'string' ? rawPayload : rawPayload.toString('utf8');
    let event: any = {};
    try {
      event = JSON.parse(payloadString);
    } catch {
      throw new Error('Malformed webhook JSON payload');
    }

    const eventId = event.event_id || event.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // 2. Idempotency check: avoid duplicate event processing
    const existingEvent = await DeliveryWebhookEvent.findOne({ eventId });
    if (existingEvent && existingEvent.processed) {
      return { status: 'duplicate_ignored', eventId };
    }

    await DeliveryWebhookEvent.findOneAndUpdate(
      { eventId },
      {
        $set: {
          provider: 'WOLT',
          eventType: event.type || event.status || 'unknown',
          payload: event,
          processed: false,
        },
      },
      { upsert: true }
    );

    // 3. Process delivery status update
    const woltDeliveryId = event.delivery_id || event.wolt_order_reference_id || event.order_reference_id;
    const rawStatus = event.status || event.delivery_status || '';

    if (woltDeliveryId) {
      const delivery = await Delivery.findOne({
        $or: [{ woltDeliveryId }, { woltOrderReference: woltDeliveryId }],
      });

      if (delivery) {
        const internalStatus = mapWoltStatusToInternal(rawStatus);
        delivery.deliveryStatus = internalStatus;
        delivery.rawProviderStatus = rawStatus;
        if (event.tracking_url || event.tracking?.url) {
          delivery.trackingUrl = event.tracking_url || event.tracking?.url;
        }
        if (event.delivery_eta) {
          delivery.deliveryEta = new Date(event.delivery_eta);
        }
        await delivery.save();

        // Sync with order lifecycle
        const order = await Order.findById(delivery.orderId);
        if (order) {
          if (internalStatus === 'DELIVERED' && order.status !== 'completed') {
            order.status = 'completed';
            order.statusHistory.push({
              status: 'completed',
              changedAt: new Date(),
              changedBy: order.customerId,
              note: 'Delivered by Wolt courier.',
            });
            await order.save();
          } else if (internalStatus === 'OUT_FOR_DELIVERY' && order.status !== 'out_for_delivery') {
            order.status = 'out_for_delivery';
            order.statusHistory.push({
              status: 'out_for_delivery',
              changedAt: new Date(),
              changedBy: order.customerId,
              note: 'Wolt courier picked up delivery.',
            });
            await order.save();
          }
        }
      }
    }

    // Mark event as processed
    await DeliveryWebhookEvent.updateOne({ eventId }, { $set: { processed: true, processedAt: new Date() } });

    return { status: 'success', eventId };
  }

  /**
   * Super Admin Visibility: Provides delivery integration health across restaurants.
   */
  static async getSuperAdminDeliveryMetrics() {
    const totalDeliveries = await Delivery.countDocuments();
    const woltDeliveries = await Delivery.countDocuments({ provider: 'WOLT' });
    const failedDeliveries = await Delivery.countDocuments({ deliveryStatus: 'FAILED' });
    const deliveredDeliveries = await Delivery.countDocuments({ deliveryStatus: 'DELIVERED' });

    const connections = await WoltConnection.find().lean();
    const restaurantIds = connections.map((c) => c.restaurantId);
    const restaurants = await Restaurant.find({ _id: { $in: restaurantIds } }).lean();
    const restMap = new Map(restaurants.map((r) => [r._id.toString(), r.name]));

    const connectionReports = connections.map((c) => ({
      restaurantId: c.restaurantId,
      restaurantName: restMap.get(c.restaurantId.toString()) || 'Unknown Restaurant',
      woltVenueId: c.woltVenueId,
      woltVenueName: c.woltVenueName,
      status: c.status,
      lastSyncAt: c.lastSyncAt,
      hasError: !!c.lastError,
      lastError: c.lastError,
    }));

    return {
      overview: {
        totalDeliveries,
        woltDeliveries,
        deliveredDeliveries,
        failedDeliveries,
        connectedRestaurants: connections.filter((c) => c.status === 'CONNECTED').length,
      },
      connections: connectionReports,
    };
  }
}
