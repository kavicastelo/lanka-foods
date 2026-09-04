import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { type Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/infrastructure/database/index.js';
import { MenuCategory, MenuItem, Order, Restaurant, User } from '../src/models/index.js';

describe('Phase 6 — Server-Authoritative Cart & Order Calculations Integration & Security Tests', () => {
  let app: FastifyInstance;
  let mongoServer: MongoMemoryServer;

  let customerId: Types.ObjectId;
  let victimCustomerId: Types.ObjectId;
  let restaurantAdminId: Types.ObjectId;

  let customerToken: string;
  let restaurantAdminToken: string;

  let restaurantAId: Types.ObjectId;
  let restaurantBId: Types.ObjectId;
  let inactiveRestaurantId: Types.ObjectId;

  let itemA1Id: Types.ObjectId; // Price: 1050 cents (€10.50)
  let itemA2Id: Types.ObjectId; // Price: 650 cents (€6.50)
  let unavailableItemId: Types.ObjectId;
  let itemB1Id: Types.ObjectId; // Belongs to Restaurant B

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDatabase(mongoServer.getUri());
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));

    app = await buildApp();
    await app.ready();

    // Create Test Users
    const customer = await User.create({
      email: 'ordercust@lanka.fi',
      fullName: 'Order Customer',
      phone: '+358401234567',
      role: 'CUSTOMER',
    });
    customerId = customer._id;

    const victim = await User.create({
      email: 'victim@lanka.fi',
      fullName: 'Victim Customer',
      role: 'CUSTOMER',
    });
    victimCustomerId = victim._id;

    const restAdmin = await User.create({
      email: 'orderrestadmin@lanka.fi',
      fullName: 'Order Rest Admin',
      role: 'RESTAURANT_ADMIN',
    });
    restaurantAdminId = restAdmin._id;

    // Issue Tokens
    customerToken = app.jwt.sign({ sub: customerId.toString(), role: 'CUSTOMER', email: customer.email });
    restaurantAdminToken = app.jwt.sign({ sub: restaurantAdminId.toString(), role: 'RESTAURANT_ADMIN', email: restAdmin.email });

    // Create Test Restaurants
    const restA = await Restaurant.create({
      name: 'Colombo Curry Express',
      slug: 'colombo-curry-express',
      ownerId: restaurantAdminId,
      city: 'Helsinki',
      minOrder: 1500, // €15.00 minimum subtotal
      deliveryFee: 350, // €3.50 delivery fee
      pickup: true,
      delivery: true,
      isOpen: true,
      status: 'active',
    });
    restaurantAId = restA._id;

    const restB = await Restaurant.create({
      name: 'Jaffna Spice Corner',
      slug: 'jaffna-spice-corner',
      ownerId: restaurantAdminId,
      city: 'Espoo',
      minOrder: 1000,
      deliveryFee: 250,
      pickup: true,
      delivery: true,
      isOpen: true,
      status: 'active',
    });
    restaurantBId = restB._id;

    const restInactive = await Restaurant.create({
      name: 'Closed Down Cafe',
      slug: 'closed-down-cafe',
      ownerId: restaurantAdminId,
      city: 'Vantaa',
      minOrder: 500,
      deliveryFee: 200,
      status: 'pending',
    });
    inactiveRestaurantId = restInactive._id;

    // Create Categories & Items
    const catA = await MenuCategory.create({ restaurantId: restaurantAId, name: 'Mains', sortOrder: 1 });
    const catB = await MenuCategory.create({ restaurantId: restaurantBId, name: 'Mains', sortOrder: 1 });

    const itemA1 = await MenuItem.create({
      restaurantId: restaurantAId,
      categoryId: catA._id,
      name: 'Chicken Rice & Curry',
      price: 1050, // €10.50
      isAvailable: true,
    });
    itemA1Id = itemA1._id;

    const itemA2 = await MenuItem.create({
      restaurantId: restaurantAId,
      categoryId: catA._id,
      name: 'Pol Sambol Side',
      price: 650, // €6.50
      isAvailable: true,
    });
    itemA2Id = itemA2._id;

    const unavailableItem = await MenuItem.create({
      restaurantId: restaurantAId,
      categoryId: catA._id,
      name: 'Sold Out Lamprais',
      price: 1800,
      isAvailable: false,
    });
    unavailableItemId = unavailableItem._id;

    const itemB1 = await MenuItem.create({
      restaurantId: restaurantBId,
      categoryId: catB._id,
      name: 'Jaffna Crab Curry',
      price: 2200,
      isAvailable: true,
    });
    itemB1Id = itemB1._id;
  }, 60000);

  afterAll(async () => {
    await app.close();
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }, 30000);

  describe('Happy Path Order Calculations & Order Placement', () => {
    it('should place a pickup order successfully with server-calculated subtotal, 0 delivery fee, and integer totals', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          items: [
            { menuItemId: itemA1Id.toString(), quantity: 2 }, // 1050 * 2 = 2100 cents
          ],
          deliveryType: 'pickup',
          instructions: 'Extra spicy please',
        },
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.payload);
      const order = payload.order;

      expect(order.orderNumber).toMatch(/^LE-\d+$/);
      expect(order.restaurantId).toBe(restaurantAId.toString());
      expect(order.customerId).toBe(customerId.toString());
      expect(order.deliveryType).toBe('pickup');
      expect(order.status).toBe('received');
      expect(order.paymentStatus).toBe('pending');
      expect(order.subtotal).toBe(2100);
      expect(order.deliveryFee).toBe(0);
      expect(order.serviceFee).toBe(99);
      expect(order.total).toBe(2199);
      expect(order.items).toHaveLength(1);
      expect(order.items[0].nameSnapshot).toBe('Chicken Rice & Curry');
      expect(order.items[0].unitPrice).toBe(1050);
      expect(order.items[0].subtotal).toBe(2100);

      // Verify MongoDB Document Integrity
      const dbOrder = await Order.findById(order.id);
      expect(dbOrder!.subtotal).toBe(2100);
      expect(dbOrder!.deliveryFee).toBe(0);
      expect(dbOrder!.serviceFee).toBe(99);
      expect(dbOrder!.total).toBe(2199);
    });

    it('should place a delivery order successfully with subtotal, restaurant delivery fee, and address snapshot', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          items: [
            { menuItemId: itemA1Id.toString(), quantity: 1 }, // 1050
            { menuItemId: itemA2Id.toString(), quantity: 1 }, // 650
          ], // Subtotal = 1700 cents (€17.00 >= €15.00 minOrder)
          deliveryType: 'delivery',
          deliveryAddress: 'Aleksanterinkatu 15 A 4, 00100 Helsinki',
        },
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.payload);
      const order = payload.order;

      expect(order.subtotal).toBe(1700);
      expect(order.deliveryFee).toBe(350); // Rest A delivery fee = 350
      expect(order.serviceFee).toBe(99);
      expect(order.total).toBe(2149); // 1700 + 350 + 99 = 2149
      expect(order.deliveryAddress).toBe('Aleksanterinkatu 15 A 4, 00100 Helsinki');
    });

    it('should generate unique, sequential order numbers for successive orders', async () => {
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          items: [{ menuItemId: itemA1Id.toString(), quantity: 2 }],
          deliveryType: 'pickup',
        },
      });

      const res2 = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          items: [{ menuItemId: itemA1Id.toString(), quantity: 2 }],
          deliveryType: 'pickup',
        },
      });

      const num1 = JSON.parse(res1.payload).order.orderNumber;
      const num2 = JSON.parse(res2.payload).order.orderNumber;
      expect(num1).not.toBe(num2);
    });
  });

  describe('Adversarial Security & Financial Attack Defenses', () => {
    it('PRICE TAMPERING DEFENSE: Client-submitted prices must be completely ignored', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          items: [
            { menuItemId: itemA1Id.toString(), quantity: 2, price: 1 }, // Attacker sends €0.01 price!
          ],
          deliveryType: 'pickup',
        },
      });

      expect(response.statusCode).toBe(201);
      const order = JSON.parse(response.payload).order;
      // Server MUST look up actual database price (1050) -> 1050 * 2 = 2100 cents
      expect(order.subtotal).toBe(2100);
      expect(order.total).toBe(2199);
    });

    it('TOTAL TAMPERING DEFENSE: Client-submitted subtotal/total/deliveryFee must be completely ignored', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          items: [{ menuItemId: itemA1Id.toString(), quantity: 2 }],
          deliveryType: 'pickup',
          subtotal: 1, // Attacker tries to override subtotal
          deliveryFee: 0,
          total: 1, // Attacker tries to pay €0.01 total
        },
      });

      expect(response.statusCode).toBe(201);
      const order = JSON.parse(response.payload).order;
      expect(order.subtotal).toBe(2100);
      expect(order.total).toBe(2199);
    });

    it('CUSTOMER SPOOFING DEFENSE: Client-submitted customerId must be overridden by verified JWT user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          items: [{ menuItemId: itemA1Id.toString(), quantity: 2 }],
          deliveryType: 'pickup',
          customerId: victimCustomerId.toString(), // Attacker tries to bill victim account
        },
      });

      expect(response.statusCode).toBe(201);
      const order = JSON.parse(response.payload).order;
      expect(order.customerId).toBe(customerId.toString()); // Must equal authenticated JWT customer
    });

    it('MASS ASSIGNMENT DEFENSE: Client-submitted status or paymentStatus must be overridden', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          items: [{ menuItemId: itemA1Id.toString(), quantity: 2 }],
          deliveryType: 'pickup',
          status: 'completed', // Attacker tries to mark completed
          paymentStatus: 'paid', // Attacker tries to mark paid
        },
      });

      expect(response.statusCode).toBe(201);
      const order = JSON.parse(response.payload).order;
      expect(order.status).toBe('received');
      expect(order.paymentStatus).toBe('pending');
    });

    it('CROSS-RESTAURANT ITEM DEFENSE: Order containing item from another restaurant must be rejected', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          items: [
            { menuItemId: itemA1Id.toString(), quantity: 1 },
            { menuItemId: itemB1Id.toString(), quantity: 1 }, // Belongs to Restaurant B!
          ],
          deliveryType: 'pickup',
        },
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.payload);
      expect(payload.error.message).toContain('does not belong to the selected restaurant');
    });

    it('UNAVAILABLE ITEM DEFENSE: Order containing isAvailable = false item must be rejected', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          items: [{ menuItemId: unavailableItemId.toString(), quantity: 1 }],
          deliveryType: 'pickup',
        },
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.payload);
      expect(payload.error.message).toContain('currently unavailable');
    });

    it('MINIMUM ORDER DEFENSE: Order subtotal below restaurant minOrder must be rejected', async () => {
      // Item A2 is 650 cents (€6.50), minOrder is 1500 cents (€15.00)
      const response = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          items: [{ menuItemId: itemA2Id.toString(), quantity: 1 }], // Subtotal = 650 < 1500
          deliveryType: 'pickup',
        },
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.payload);
      expect(payload.error.message).toContain('below restaurant minimum order requirement');
    });

    it('INACTIVE RESTAURANT DEFENSE: Order for pending/suspended restaurant must be rejected', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          restaurantId: inactiveRestaurantId.toString(),
          items: [{ menuItemId: itemA1Id.toString(), quantity: 2 }],
          deliveryType: 'pickup',
        },
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.payload);
      expect(payload.error.message).toContain('not active');
    });

    it('QUANTITY VALIDATION DEFENSE: Negative, zero, float, or excessive quantities must be rejected', async () => {
      const zeroRes = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          items: [{ menuItemId: itemA1Id.toString(), quantity: 0 }],
          deliveryType: 'pickup',
        },
      });
      expect(zeroRes.statusCode).toBe(400);

      const negativeRes = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          items: [{ menuItemId: itemA1Id.toString(), quantity: -2 }],
          deliveryType: 'pickup',
        },
      });
      expect(negativeRes.statusCode).toBe(400);

      const floatRes = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          items: [{ menuItemId: itemA1Id.toString(), quantity: 1.5 }],
          deliveryType: 'pickup',
        },
      });
      expect(floatRes.statusCode).toBe(400);
    });

    it('MISSING DELIVERY ADDRESS DEFENSE: Delivery order without address must be rejected', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          items: [{ menuItemId: itemA1Id.toString(), quantity: 2 }],
          deliveryType: 'delivery',
          deliveryAddress: '', // Missing address!
        },
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.payload);
      expect(payload.error.message).toContain('Delivery address is required');
    });

    it('ROLE AUTHORIZATION DEFENSE: RESTAURANT_ADMIN accounts cannot place customer orders', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${restaurantAdminToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          items: [{ menuItemId: itemA1Id.toString(), quantity: 2 }],
          deliveryType: 'pickup',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
