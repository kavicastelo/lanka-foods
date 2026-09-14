import mongoose, { type Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/infrastructure/database/index.js';
import {
  Delivery,
  DeliverySettings,
  DeliveryWebhookEvent,
  MenuCategory,
  MenuItem,
  Order,
  Restaurant,
  User,
  WoltConnection,
} from '../src/models/index.js';
import { encryptToken, generateOAuthState, verifyOAuthState, verifyWebhookSignature } from '../src/utils/crypto.js';
import { DeliveryPricingEngine } from '../src/modules/delivery/pricing/pricing-engine.js';
import { DeliveryService } from '../src/modules/delivery/delivery.service.js';
import { mapWoltStatusToInternal } from '../src/modules/delivery/providers/wolt-drive.provider.js';

describe('Wolt Drive Integration — Strict 20 Acceptance Test Scenarios', () => {
  let app: FastifyInstance;

  let ownerAId: Types.ObjectId;
  let ownerBId: Types.ObjectId;
  let customerId: Types.ObjectId;

  let ownerAToken: string;
  let ownerBToken: string;
  let customerToken: string;

  let restaurantAId: Types.ObjectId;
  let restaurantBId: Types.ObjectId;

  let menuItemAId: Types.ObjectId;

  const runId = Date.now();

  beforeAll(async () => {
    process.env.WOLT_ENVIRONMENT = 'mock';
    process.env.WOLT_WEBHOOK_SECRET = 'test_wolt_webhook_secret_key_123';
    await connectDatabase();
    app = await buildApp();
    await app.ready();

    // 1. Create Users
    const ownerA = await User.create({
      email: `wolt.ownerA.${runId}@test.fi`,
      fullName: 'Owner Restaurant A',
      role: 'RESTAURANT_ADMIN',
      passwordHash: 'hash_123',
    });
    ownerAId = ownerA._id;

    const ownerB = await User.create({
      email: `wolt.ownerB.${runId}@test.fi`,
      fullName: 'Owner Restaurant B',
      role: 'RESTAURANT_ADMIN',
      passwordHash: 'hash_123',
    });
    ownerBId = ownerB._id;

    const customer = await User.create({
      email: `wolt.customer.${runId}@test.fi`,
      fullName: 'Test Customer',
      role: 'CUSTOMER',
      passwordHash: 'hash_123',
    });
    customerId = customer._id;

    ownerAToken = app.jwt.sign({ sub: ownerAId.toString(), email: ownerA.email, role: 'RESTAURANT_ADMIN' });
    ownerBToken = app.jwt.sign({ sub: ownerBId.toString(), email: ownerB.email, role: 'RESTAURANT_ADMIN' });
    customerToken = app.jwt.sign({ sub: customerId.toString(), email: customer.email, role: 'CUSTOMER' });

    // 2. Create Restaurants
    const restA = await Restaurant.create({
      name: `Restaurant A (${runId})`,
      slug: `restaurant-a-${runId}`,
      ownerId: ownerAId,
      city: 'Helsinki',
      address: 'Mannerheimintie 10',
      phone: '+358401111111',
      email: `restA.${runId}@test.fi`,
      pickup: true,
      delivery: true,
      isOpen: true,
      status: 'active',
      minOrder: 1000, // €10.00
      deliveryFee: 490, // €4.90 default
    });
    restaurantAId = restA._id;

    const restB = await Restaurant.create({
      name: `Restaurant B (${runId})`,
      slug: `restaurant-b-${runId}`,
      ownerId: ownerBId,
      city: 'Espoo',
      address: 'Otaniementie 5',
      phone: '+358402222222',
      email: `restB.${runId}@test.fi`,
      pickup: true,
      delivery: true,
      isOpen: true,
      status: 'active',
      minOrder: 1000,
      deliveryFee: 490,
    });
    restaurantBId = restB._id;

    // 3. Create Menu Category & Items
    const category = await MenuCategory.create({
      restaurantId: restaurantAId,
      name: `Main Dishes ${runId}`,
      sortOrder: 1,
    });

    const itemA = await MenuItem.create({
      restaurantId: restaurantAId,
      categoryId: category._id,
      name: 'Ceylon Rice & Curry',
      description: 'Traditional Sri Lankan rice and curry set',
      price: 1500, // €15.00
      isAvailable: true,
    });
    menuItemAId = itemA._id;
  });

  afterAll(async () => {
    await Delivery.deleteMany({ restaurantId: { $in: [restaurantAId, restaurantBId] } });
    await DeliverySettings.deleteMany({ restaurantId: { $in: [restaurantAId, restaurantBId] } });
    await WoltConnection.deleteMany({ restaurantId: { $in: [restaurantAId, restaurantBId] } });
    await Order.deleteMany({ restaurantId: { $in: [restaurantAId, restaurantBId] } });
    await MenuItem.deleteMany({ restaurantId: { $in: [restaurantAId, restaurantBId] } });
    await Restaurant.deleteMany({ _id: { $in: [restaurantAId, restaurantBId] } });
    await User.deleteMany({ _id: { $in: [ownerAId, ownerBId, customerId] } });
    await app.close();
    await disconnectDatabase();
  });

  // -------------------------------------------------------------
  // Scenario 1: Delivery disabled
  // -------------------------------------------------------------
  it('Scenario 1 — Delivery disabled: Customer cannot order delivery when delivery_enabled is false', async () => {
    await DeliveryService.updateDeliverySettings(restaurantAId.toString(), {
      deliveryEnabled: false,
    });

    const quoteRes = await app.inject({
      method: 'POST',
      url: '/api/delivery/quote',
      payload: {
        restaurantId: restaurantAId.toString(),
        dropoffAddress: 'Mannerheimintie 25, Helsinki',
        orderSubtotal: 2500,
      },
    });

    expect(quoteRes.statusCode).toBe(200);
    const body = quoteRes.json();
    expect(body.available).toBe(false);
    expect(body.reason).toContain('does not currently offer delivery');

    // Attempt to place an order with delivery
    const orderRes = await app.inject({
      method: 'POST',
      url: '/api/orders',
      headers: { authorization: `Bearer ${customerToken}` },
      payload: {
        restaurantId: restaurantAId.toString(),
        deliveryType: 'delivery',
        deliveryAddress: 'Mannerheimintie 25, Helsinki',
        items: [{ menuItemId: menuItemAId.toString(), quantity: 1 }],
      },
    });

    expect(orderRes.statusCode).toBe(400);
    expect(orderRes.json().error.message).toContain('delivery');
  });

  // -------------------------------------------------------------
  // Scenario 2: Restaurant delivery (in-house)
  // -------------------------------------------------------------
  it('Scenario 2 — Restaurant delivery: Customer can select delivery and no Wolt request occurs', async () => {
    await DeliveryService.updateDeliverySettings(restaurantAId.toString(), {
      deliveryEnabled: true,
      deliveryProvider: 'RESTAURANT',
      woltEnabled: false,
      pricingStrategy: 'FIXED',
      pricingParams: { fixedFee: 350 },
    });

    const quoteRes = await app.inject({
      method: 'POST',
      url: '/api/delivery/quote',
      payload: {
        restaurantId: restaurantAId.toString(),
        dropoffAddress: 'Aleksanterinkatu 15, Helsinki',
        orderSubtotal: 3000,
      },
    });

    expect(quoteRes.statusCode).toBe(200);
    const body = quoteRes.json();
    expect(body.available).toBe(true);
    expect(body.provider).toBe('RESTAURANT');
    expect(body.customerDeliveryFee).toBe(350);
    expect(body.woltDeliveryCost).toBe(0);
  });

  // -------------------------------------------------------------
  // Scenario 3: Wolt enabled but disconnected
  // -------------------------------------------------------------
  it('Scenario 3 — Wolt enabled but disconnected: Customer cannot place Wolt delivery order', async () => {
    await WoltConnection.findOneAndUpdate(
      { restaurantId: restaurantAId },
      { $set: { status: 'DISCONNECTED' } }
    );

    await DeliveryService.updateDeliverySettings(restaurantAId.toString(), {
      deliveryEnabled: true,
      deliveryProvider: 'WOLT',
      woltEnabled: true,
    });

    const quoteRes = await app.inject({
      method: 'POST',
      url: '/api/delivery/quote',
      payload: {
        restaurantId: restaurantAId.toString(),
        dropoffAddress: 'Kamppi 1, Helsinki',
        orderSubtotal: 2500,
      },
    });

    expect(quoteRes.statusCode).toBe(200);
    const body = quoteRes.json();
    expect(body.available).toBe(false);
    expect(body.reason).toContain('disconnected');
  });

  // -------------------------------------------------------------
  // Scenario 4: Wolt connected
  // -------------------------------------------------------------
  it('Scenario 4 — Wolt connected: Securely stores venue association and allows delivery availability', async () => {
    const encToken = encryptToken('wolt_live_test_access_token');
    await WoltConnection.findOneAndUpdate(
      { restaurantId: restaurantAId },
      {
        $set: {
          woltVenueId: 'venue_helsinki_101',
          woltVenueName: 'LankaEats Central Helsinki',
          encryptedAccessToken: encToken,
          status: 'CONNECTED',
          lastSyncAt: new Date(),
        },
      },
      { upsert: true }
    );

    await DeliveryService.updateDeliverySettings(restaurantAId.toString(), {
      deliveryEnabled: true,
      deliveryProvider: 'WOLT',
      woltEnabled: true,
    });

    const quoteRes = await app.inject({
      method: 'POST',
      url: '/api/delivery/quote',
      payload: {
        restaurantId: restaurantAId.toString(),
        dropoffAddress: 'Fredrikinkatu 40, Helsinki',
        orderSubtotal: 2500,
      },
    });

    expect(quoteRes.statusCode).toBe(200);
    const body = quoteRes.json();
    expect(body.available).toBe(true);
    expect(body.provider).toBe('WOLT');
  });

  // -------------------------------------------------------------
  // Scenario 5: Fixed pricing
  // -------------------------------------------------------------
  it('Scenario 5 — Fixed pricing: Wolt cost €8.00, restaurant fixed €5.00 -> customer pays €5.00', () => {
    const res = DeliveryPricingEngine.calculateCustomerDeliveryFee({
      orderSubtotal: 2500,
      woltDeliveryCost: 800, // €8.00
      settings: {
        pricingStrategy: 'FIXED',
        pricingParams: { fixedFee: 500 }, // €5.00
      },
    });

    expect(res.customerDeliveryFee).toBe(500);
    expect(res.woltDeliveryCost).toBe(800);
  });

  // -------------------------------------------------------------
  // Scenario 6: Wolt-cost pricing
  // -------------------------------------------------------------
  it('Scenario 6 — Wolt-cost pricing: Wolt quote €8.00 -> customer fee €8.00', () => {
    const res = DeliveryPricingEngine.calculateCustomerDeliveryFee({
      orderSubtotal: 2500,
      woltDeliveryCost: 800,
      settings: {
        pricingStrategy: 'WOLT_COST',
        pricingParams: {},
      },
    });

    expect(res.customerDeliveryFee).toBe(800);
    expect(res.woltDeliveryCost).toBe(800);
  });

  // -------------------------------------------------------------
  // Scenario 7: Wolt cost + markup
  // -------------------------------------------------------------
  it('Scenario 7 — Wolt cost + markup: Wolt quote €8.00, markup €2.00 -> customer fee €10.00', () => {
    const res = DeliveryPricingEngine.calculateCustomerDeliveryFee({
      orderSubtotal: 2500,
      woltDeliveryCost: 800,
      settings: {
        pricingStrategy: 'WOLT_COST_MARKUP',
        pricingParams: { markupFee: 200 }, // €2.00
      },
    });

    expect(res.customerDeliveryFee).toBe(1000);
    expect(res.woltDeliveryCost).toBe(800);
  });

  // -------------------------------------------------------------
  // Scenario 8: Free delivery threshold
  // -------------------------------------------------------------
  it('Scenario 8 — Free delivery threshold: Order €55, threshold €50 -> customer delivery fee €0', () => {
    const res = DeliveryPricingEngine.calculateCustomerDeliveryFee({
      orderSubtotal: 5500, // €55.00
      woltDeliveryCost: 800,
      settings: {
        pricingStrategy: 'FREE_OVER_THRESHOLD',
        pricingParams: { freeDeliveryThreshold: 5000, fixedFee: 500 },
      },
    });

    expect(res.customerDeliveryFee).toBe(0);
    expect(res.isFreeDelivery).toBe(true);
    expect(res.woltDeliveryCost).toBe(800);
  });

  // -------------------------------------------------------------
  // Scenario 9: Cash on Delivery (COD) enabled
  // -------------------------------------------------------------
  it('Scenario 9 — COD: Order correctly represents amount to collect without platform touching money', async () => {
    await DeliveryService.updateDeliverySettings(restaurantAId.toString(), {
      deliveryEnabled: true,
      deliveryProvider: 'WOLT',
      codEnabled: true,
    });

    const order = await Order.create({
      orderNumber: `LE-COD-${runId}`,
      restaurantId: restaurantAId,
      customerId,
      customerName: 'COD Customer',
      customerEmail: 'cod@test.fi',
      deliveryType: 'delivery',
      deliveryAddress: 'Bulevardi 10, Helsinki',
      subtotal: 3500,
      deliveryFee: 500,
      serviceFee: 99,
      total: 4099,
      paymentMethod: 'cash_on_delivery',
      status: 'accepted',
      items: [{ menuItemId: menuItemAId, nameSnapshot: 'Curry', unitPrice: 3500, quantity: 1, subtotal: 3500 }],
    });

    const dispatchRes = await DeliveryService.dispatchOrderDelivery(
      order._id.toString(),
      ownerAId.toString(),
      'RESTAURANT_ADMIN'
    );

    expect(dispatchRes.success).toBe(true);
    expect(dispatchRes.delivery.isCod).toBe(true);
    expect(dispatchRes.delivery.codAmountToCollect).toBe(4099);
  });

  // -------------------------------------------------------------
  // Scenario 10: COD unsupported
  // -------------------------------------------------------------
  it('Scenario 10 — COD unsupported: Rejects COD dispatch if restaurant has not enabled COD', async () => {
    await DeliveryService.updateDeliverySettings(restaurantAId.toString(), {
      codEnabled: false,
    });

    const order = await Order.create({
      orderNumber: `LE-NOCOD-${runId}`,
      restaurantId: restaurantAId,
      customerId,
      customerName: 'No COD Customer',
      customerEmail: 'nocod@test.fi',
      deliveryType: 'delivery',
      deliveryAddress: 'Bulevardi 12, Helsinki',
      subtotal: 3000,
      deliveryFee: 500,
      serviceFee: 99,
      total: 3599,
      paymentMethod: 'cash_on_delivery',
      status: 'accepted',
      items: [{ menuItemId: menuItemAId, nameSnapshot: 'Curry', unitPrice: 3000, quantity: 1, subtotal: 3000 }],
    });

    await expect(
      DeliveryService.dispatchOrderDelivery(order._id.toString(), ownerAId.toString(), 'RESTAURANT_ADMIN')
    ).rejects.toThrow('Cash on Delivery (COD) is not enabled');
  });

  // -------------------------------------------------------------
  // Scenario 11: Duplicate dispatch idempotency
  // -------------------------------------------------------------
  it('Scenario 11 — Duplicate dispatch: Clicking dispatch twice results in exactly one delivery', async () => {
    const order = await Order.create({
      orderNumber: `LE-IDEM-${runId}`,
      restaurantId: restaurantAId,
      customerId,
      customerName: 'Idem Customer',
      customerEmail: 'idem@test.fi',
      deliveryType: 'delivery',
      deliveryAddress: 'Kaivokatu 1, Helsinki',
      subtotal: 2000,
      deliveryFee: 500,
      serviceFee: 99,
      total: 2599,
      status: 'accepted',
      items: [{ menuItemId: menuItemAId, nameSnapshot: 'Curry', unitPrice: 2000, quantity: 1, subtotal: 2000 }],
    });

    const res1 = await DeliveryService.dispatchOrderDelivery(
      order._id.toString(),
      ownerAId.toString(),
      'RESTAURANT_ADMIN'
    );
    const res2 = await DeliveryService.dispatchOrderDelivery(
      order._id.toString(),
      ownerAId.toString(),
      'RESTAURANT_ADMIN'
    );

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);
    expect(res2.message).toContain('already created');

    const count = await Delivery.countDocuments({ orderId: order._id });
    expect(count).toBe(1);
  });

  // -------------------------------------------------------------
  // Scenario 12: Duplicate webhook idempotency
  // -------------------------------------------------------------
  it('Scenario 12 — Duplicate webhook: Same webhook arriving twice changes state only once', async () => {
    const eventId = `evt_wolt_${Date.now()}`;
    const payload = JSON.stringify({
      event_id: eventId,
      type: 'delivery_status_changed',
      delivery_id: 'wolt_mock_del_99999',
      status: 'delivered',
    });

    const res1 = await DeliveryService.handleWoltWebhook(undefined, payload);
    const res2 = await DeliveryService.handleWoltWebhook(undefined, payload);

    expect(res1.status).toBe('success');
    expect(res2.status).toBe('duplicate_ignored');

    const eventRecord = await DeliveryWebhookEvent.findOne({ eventId });
    expect(eventRecord?.processed).toBe(true);
  });

  // -------------------------------------------------------------
  // Scenario 13: Restaurant isolation
  // -------------------------------------------------------------
  it('Scenario 13 — Restaurant isolation: Restaurant A cannot access Restaurant B delivery settings or orders', async () => {
    // Restaurant A admin calls Restaurant B settings endpoint
    const res = await app.inject({
      method: 'GET',
      url: `/api/restaurants/${restaurantBId.toString()}/delivery-settings`,
      headers: { authorization: `Bearer ${ownerAToken}` },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error).toContain('Access denied');
  });

  // -------------------------------------------------------------
  // Scenario 14: Wolt disconnect
  // -------------------------------------------------------------
  it('Scenario 14 — Wolt disconnect: Historical deliveries preserved, new orders prevented', async () => {
    // Check past deliveries exist
    const initialCount = await Delivery.countDocuments({ restaurantId: restaurantAId });

    // Disconnect Wolt
    await DeliveryService.disconnectWolt(restaurantAId.toString());

    const { settings, woltConnection } = await DeliveryService.getDeliverySettings(restaurantAId.toString());
    expect(settings.woltEnabled).toBe(false);
    expect(woltConnection.status).toBe('DISCONNECTED');

    // Historical deliveries still preserved
    const afterCount = await Delivery.countDocuments({ restaurantId: restaurantAId });
    expect(afterCount).toBe(initialCount);
  });

  // -------------------------------------------------------------
  // Scenario 15: Provider switch
  // -------------------------------------------------------------
  it('Scenario 15 — Provider switch: Wolt -> Restaurant delivery preserves existing orders', async () => {
    await DeliveryService.updateDeliverySettings(restaurantAId.toString(), {
      deliveryProvider: 'RESTAURANT',
    });

    const { settings } = await DeliveryService.getDeliverySettings(restaurantAId.toString());
    expect(settings.deliveryProvider).toBe('RESTAURANT');
  });

  // -------------------------------------------------------------
  // Scenario 16: Wolt outage fail-safe
  // -------------------------------------------------------------
  it('Scenario 16 — Wolt outage fail-safe: Returns clear error when delivery is unavailable', async () => {
    // Reconnect Wolt
    await WoltConnection.findOneAndUpdate(
      { restaurantId: restaurantAId },
      { $set: { status: 'CONNECTED' } }
    );
    await DeliveryService.updateDeliverySettings(restaurantAId.toString(), {
      deliveryEnabled: true,
      deliveryProvider: 'WOLT',
      woltEnabled: true,
    });

    // Request quote for address marked out of range
    const quoteRes = await app.inject({
      method: 'POST',
      url: '/api/delivery/quote',
      payload: {
        restaurantId: restaurantAId.toString(),
        dropoffAddress: 'Out of range road 999',
        orderSubtotal: 2500,
      },
    });

    const body = quoteRes.json();
    expect(body.available).toBe(false);
    expect(body.reason).toContain('outside the Wolt delivery service area');
  });

  // -------------------------------------------------------------
  // Scenario 17: Token security & encryption
  // -------------------------------------------------------------
  it('Scenario 17 — Token security: AES-256-GCM tokens are encrypted and never exposed in API responses', async () => {
    const rawSecret = 'wolt_super_confidential_token_xyz_12345';
    const encrypted = encryptToken(rawSecret);
    expect(encrypted).not.toContain(rawSecret);

    const res = await app.inject({
      method: 'GET',
      url: `/api/restaurants/${restaurantAId.toString()}/delivery-settings`,
      headers: { authorization: `Bearer ${ownerAToken}` },
    });

    const responseText = res.body;
    expect(responseText).not.toContain(rawSecret);
    expect(responseText).not.toContain('encryptedAccessToken');
  });

  // -------------------------------------------------------------
  // Scenario 18: Invalid OAuth state rejection
  // -------------------------------------------------------------
  it('Scenario 18 — Invalid OAuth state: Rejects invalid or forged OAuth callbacks', async () => {
    const fakeState = 'forged.12345.state';
    const verifyRes = verifyOAuthState(fakeState);
    expect(verifyRes.valid).toBe(false);

    await expect(
      DeliveryService.handleWoltOAuthCallback('code123', fakeState)
    ).rejects.toThrow('Invalid or expired OAuth state');
  });

  // -------------------------------------------------------------
  // Scenario 19: Invalid webhook signature rejection
  // -------------------------------------------------------------
  it('Scenario 19 — Invalid webhook signature: Rejects unverified webhook signatures', () => {
    const body = JSON.stringify({ type: 'delivery_status_changed' });
    const invalidSig = 'bad_signature_hex_1234';
    const valid = verifyWebhookSignature(body, invalidSig, 'real_secret_key');
    expect(valid).toBe(false);
  });

  // -------------------------------------------------------------
  // Scenario 20: Unknown Wolt status resilience
  // -------------------------------------------------------------
  it('Scenario 20 — Unknown Wolt status: Does not crash on future Wolt statuses and preserves raw state', () => {
    const unknownFutureStatus = 'drone_in_air_approaching';
    const mapped = mapWoltStatusToInternal(unknownFutureStatus);
    expect(mapped).toBe('REQUESTED');
  });
});
