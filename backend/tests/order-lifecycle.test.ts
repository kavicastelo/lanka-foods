import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { type Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/infrastructure/database/index.js';
import { MenuCategory, MenuItem, Order, Restaurant, User } from '../src/models/index.js';

describe('Phase 7 — Order Lifecycle & State Machine Service Integration & Security Tests', () => {
  let app: FastifyInstance;
  let mongoServer: MongoMemoryServer;

  let customerAId: Types.ObjectId;
  let customerBId: Types.ObjectId;
  let ownerAId: Types.ObjectId;
  let ownerBId: Types.ObjectId;
  let superAdminId: Types.ObjectId;

  let customerAToken: string;
  let customerBToken: string;
  let ownerAToken: string;
  let ownerBToken: string;
  let superAdminToken: string;

  let restaurantAId: Types.ObjectId;
  let restaurantBId: Types.ObjectId;

  let itemAId: Types.ObjectId;
  let itemBId: Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDatabase(mongoServer.getUri());
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));

    app = await buildApp();
    await app.ready();

    // Create Test Users
    const custA = await User.create({ email: 'lifecustA@lanka.fi', fullName: 'Customer A', role: 'CUSTOMER' });
    customerAId = custA._id;

    const custB = await User.create({ email: 'lifecustB@lanka.fi', fullName: 'Customer B', role: 'CUSTOMER' });
    customerBId = custB._id;

    const ownerA = await User.create({ email: 'lifeownerA@lanka.fi', fullName: 'Owner A', role: 'RESTAURANT_ADMIN' });
    ownerAId = ownerA._id;

    const ownerB = await User.create({ email: 'lifeownerB@lanka.fi', fullName: 'Owner B', role: 'RESTAURANT_ADMIN' });
    ownerBId = ownerB._id;

    const superAdmin = await User.create({ email: 'lifeadmin@lanka.fi', fullName: 'Super Admin', role: 'SUPER_ADMIN' });
    superAdminId = superAdmin._id;

    // Issue JWT Tokens
    customerAToken = app.jwt.sign({ sub: customerAId.toString(), role: 'CUSTOMER', email: custA.email });
    customerBToken = app.jwt.sign({ sub: customerBId.toString(), role: 'CUSTOMER', email: custB.email });
    ownerAToken = app.jwt.sign({ sub: ownerAId.toString(), role: 'RESTAURANT_ADMIN', email: ownerA.email });
    ownerBToken = app.jwt.sign({ sub: ownerBId.toString(), role: 'RESTAURANT_ADMIN', email: ownerB.email });
    superAdminToken = app.jwt.sign({ sub: superAdminId.toString(), role: 'SUPER_ADMIN', email: superAdmin.email });

    // Create Test Restaurants
    const restA = await Restaurant.create({
      name: 'Tampere Spice House',
      slug: 'tampere-spice-house',
      ownerId: ownerAId,
      city: 'Tampere',
      minOrder: 1000,
      deliveryFee: 300,
      pickup: true,
      delivery: true,
      isOpen: true,
      status: 'active',
    });
    restaurantAId = restA._id;

    const restB = await Restaurant.create({
      name: 'Turku Ceylon Kitchen',
      slug: 'turku-ceylon-kitchen',
      ownerId: ownerBId,
      city: 'Turku',
      minOrder: 1000,
      deliveryFee: 300,
      pickup: true,
      delivery: true,
      isOpen: true,
      status: 'active',
    });
    restaurantBId = restB._id;

    // Create Categories & Items
    const catA = await MenuCategory.create({ restaurantId: restaurantAId, name: 'Mains', sortOrder: 1 });
    const catB = await MenuCategory.create({ restaurantId: restaurantBId, name: 'Mains', sortOrder: 1 });

    const itemA = await MenuItem.create({
      restaurantId: restaurantAId,
      categoryId: catA._id,
      name: 'Tampere Devilled Chicken',
      price: 1500,
      isAvailable: true,
    });
    itemAId = itemA._id;

    const itemB = await MenuItem.create({
      restaurantId: restaurantBId,
      categoryId: catB._id,
      name: 'Turku Lamprais',
      price: 1800,
      isAvailable: true,
    });
    itemBId = itemB._id;
  }, 60000);

  afterAll(async () => {
    await app.close();
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }, 30000);

  describe('Happy Path Pickup & Delivery Order Lifecycles', () => {
    it('Pickup Lifecycle: received -> accepted -> preparing -> ready -> completed', async () => {
      // 1. Customer A places pickup order
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          items: [{ menuItemId: itemAId.toString(), quantity: 1 }],
          deliveryType: 'pickup',
        },
      });

      expect(createRes.statusCode).toBe(201);
      const orderId = JSON.parse(createRes.payload).order.id;

      // 2. Owner A transitions received -> accepted
      const res1 = await app.inject({
        method: 'PATCH',
        url: `/api/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: { status: 'accepted' },
      });
      expect(res1.statusCode).toBe(200);
      expect(JSON.parse(res1.payload).order.status).toBe('accepted');

      // 3. Owner A transitions accepted -> preparing
      const res2 = await app.inject({
        method: 'PATCH',
        url: `/api/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: { status: 'preparing' },
      });
      expect(res2.statusCode).toBe(200);
      expect(JSON.parse(res2.payload).order.status).toBe('preparing');

      // 4. Owner A transitions preparing -> ready
      const res3 = await app.inject({
        method: 'PATCH',
        url: `/api/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: { status: 'ready' },
      });
      expect(res3.statusCode).toBe(200);
      expect(JSON.parse(res3.payload).order.status).toBe('ready');

      // 5. Owner A transitions ready -> completed
      const res4 = await app.inject({
        method: 'PATCH',
        url: `/api/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: { status: 'completed' },
      });
      expect(res4.statusCode).toBe(200);
      expect(JSON.parse(res4.payload).order.status).toBe('completed');

      // Verify Audit Status History Entries in MongoDB
      const dbOrder = await Order.findById(orderId);
      expect(dbOrder!.status).toBe('completed');
      expect(dbOrder!.statusHistory).toHaveLength(5); // received + 4 transitions
      expect(dbOrder!.statusHistory[4].status).toBe('completed');
    });

    it('Delivery Lifecycle: received -> accepted -> preparing -> ready -> out_for_delivery -> completed', async () => {
      // 1. Customer A places delivery order
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          items: [{ menuItemId: itemAId.toString(), quantity: 1 }],
          deliveryType: 'delivery',
          deliveryAddress: 'Hämeenkatu 20, 33200 Tampere',
        },
      });

      expect(createRes.statusCode).toBe(201);
      const orderId = JSON.parse(createRes.payload).order.id;

      // 2. received -> accepted
      await app.inject({
        method: 'PATCH',
        url: `/api/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: { status: 'accepted' },
      });

      // 3. accepted -> preparing
      await app.inject({
        method: 'PATCH',
        url: `/api/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: { status: 'preparing' },
      });

      // 4. preparing -> ready
      await app.inject({
        method: 'PATCH',
        url: `/api/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: { status: 'ready' },
      });

      // 5. ready -> out_for_delivery
      const outRes = await app.inject({
        method: 'PATCH',
        url: `/api/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: { status: 'out_for_delivery' },
      });
      expect(outRes.statusCode).toBe(200);
      expect(JSON.parse(outRes.payload).order.status).toBe('out_for_delivery');

      // 6. out_for_delivery -> completed
      const compRes = await app.inject({
        method: 'PATCH',
        url: `/api/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: { status: 'completed' },
      });
      expect(compRes.statusCode).toBe(200);
      expect(JSON.parse(compRes.payload).order.status).toBe('completed');
    });
  });

  describe('Customer & Restaurant Order Listing & Details', () => {
    it('GET /api/orders/my-orders — should list orders for authenticated customer strictly', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/orders/my-orders',
        headers: { authorization: `Bearer ${customerAToken}` },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.data.length).toBeGreaterThanOrEqual(2);
      expect(payload.data[0].customerId).toBe(customerAId.toString());
    });

    it('GET /api/orders/my-orders — should ignore query parameter customer identity spoofing (?customerId=)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/orders/my-orders?customerId=${customerBId.toString()}`,
        headers: { authorization: `Bearer ${customerAToken}` },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.data[0].customerId).toBe(customerAId.toString()); // Only returns Customer A orders
    });

    it('GET /api/restaurant/orders — should list orders for authenticated restaurant owner', async () => {
      const resA = await app.inject({
        method: 'GET',
        url: '/api/restaurant/orders',
        headers: { authorization: `Bearer ${ownerAToken}` },
      });

      expect(resA.statusCode).toBe(200);
      const payloadA = JSON.parse(resA.payload);
      expect(payloadA.data.length).toBeGreaterThanOrEqual(1);
      expect(payloadA.data[0].restaurantId).toBe(restaurantAId.toString());

      // Create order for Restaurant B first
      await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerBToken}` },
        payload: {
          restaurantId: restaurantBId.toString(),
          items: [{ menuItemId: itemBId.toString(), quantity: 1 }],
          deliveryType: 'pickup',
        },
      });

      const resB = await app.inject({
        method: 'GET',
        url: '/api/restaurant/orders',
        headers: { authorization: `Bearer ${ownerBToken}` },
      });

      expect(resB.statusCode).toBe(200);
      const payloadB = JSON.parse(resB.payload);
      expect(payloadB.data.length).toBeGreaterThanOrEqual(1);
      expect(payloadB.data[0].restaurantId).toBe(restaurantBId.toString());
    });
  });

  describe('Adversarial Security & Invalid Transition Defenses', () => {
    it('CUSTOMER STATUS UPDATE ATTACK: Customer account cannot update order status (403 FORBIDDEN)', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          items: [{ menuItemId: itemAId.toString(), quantity: 1 }],
          deliveryType: 'pickup',
        },
      });

      const orderId = JSON.parse(createRes.payload).order.id;

      const hackRes = await app.inject({
        method: 'PATCH',
        url: `/api/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: { status: 'completed' },
      });

      expect(hackRes.statusCode).toBe(403);
    });

    it('CROSS-RESTAURANT STATUS UPDATE ATTACK: Owner A cannot update Owner B order status (404 NOT_FOUND)', async () => {
      // Create order for Restaurant B
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerBToken}` },
        payload: {
          restaurantId: restaurantBId.toString(),
          items: [{ menuItemId: itemBId.toString(), quantity: 1 }],
          deliveryType: 'pickup',
        },
      });
      const orderBId = JSON.parse(createRes.payload).order.id;

      // Owner A attempts to accept Owner B's order
      const attackRes = await app.inject({
        method: 'PATCH',
        url: `/api/orders/${orderBId}/status`,
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: { status: 'accepted' },
      });

      expect(attackRes.statusCode).toBe(404);

      // Verify Order B remains in 'received' status in MongoDB
      const dbOrderB = await Order.findById(orderBId);
      expect(dbOrderB!.status).toBe('received');
    });

    it('CUSTOMER DATA LEAK PROTECTION: Customer A cannot read Customer B order detail (404 NOT_FOUND)', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerBToken}` },
        payload: {
          restaurantId: restaurantBId.toString(),
          items: [{ menuItemId: itemBId.toString(), quantity: 1 }],
          deliveryType: 'pickup',
        },
      });
      const orderBId = JSON.parse(createRes.payload).order.id;

      const leakRes = await app.inject({
        method: 'GET',
        url: `/api/orders/${orderBId}`,
        headers: { authorization: `Bearer ${customerAToken}` },
      });

      expect(leakRes.statusCode).toBe(404);
    });

    it('INVALID STATE JUMP: received -> completed must be rejected (400 BAD_REQUEST)', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          items: [{ menuItemId: itemAId.toString(), quantity: 1 }],
          deliveryType: 'pickup',
        },
      });
      const orderId = JSON.parse(createRes.payload).order.id;

      const jumpRes = await app.inject({
        method: 'PATCH',
        url: `/api/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: { status: 'completed' },
      });

      expect(jumpRes.statusCode).toBe(400);
      expect(JSON.parse(jumpRes.payload).error.message).toContain('cannot transition');
    });

    it('DELIVERY LIFECYCLE BYPASS: Delivery order ready -> completed must be rejected without out_for_delivery (400 BAD_REQUEST)', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          items: [{ menuItemId: itemAId.toString(), quantity: 1 }],
          deliveryType: 'delivery',
          deliveryAddress: 'Test Address 123',
        },
      });
      const orderId = JSON.parse(createRes.payload).order.id;

      // Advance to ready
      await app.inject({ method: 'PATCH', url: `/api/orders/${orderId}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'accepted' } });
      await app.inject({ method: 'PATCH', url: `/api/orders/${orderId}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'preparing' } });
      await app.inject({ method: 'PATCH', url: `/api/orders/${orderId}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'ready' } });

      // Attempt ready -> completed (bypassing out_for_delivery)
      const bypassRes = await app.inject({
        method: 'PATCH',
        url: `/api/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: { status: 'completed' },
      });

      expect(bypassRes.statusCode).toBe(400);
      expect(JSON.parse(bypassRes.payload).error.message).toContain('cannot bypass');
    });

    it('PICKUP LIFECYCLE RULE: Pickup order ready -> out_for_delivery must be rejected (400 BAD_REQUEST)', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          items: [{ menuItemId: itemAId.toString(), quantity: 1 }],
          deliveryType: 'pickup',
        },
      });
      const orderId = JSON.parse(createRes.payload).order.id;

      await app.inject({ method: 'PATCH', url: `/api/orders/${orderId}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'accepted' } });
      await app.inject({ method: 'PATCH', url: `/api/orders/${orderId}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'preparing' } });
      await app.inject({ method: 'PATCH', url: `/api/orders/${orderId}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'ready' } });

      const pickupOutRes = await app.inject({
        method: 'PATCH',
        url: `/api/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: { status: 'out_for_delivery' },
      });

      expect(pickupOutRes.statusCode).toBe(400);
      expect(JSON.parse(pickupOutRes.payload).error.message).toContain('Pickup orders cannot transition to');
    });

    it('TERMINAL STATE MODIFICATION: completed order cannot be transitioned (400 BAD_REQUEST)', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          items: [{ menuItemId: itemAId.toString(), quantity: 1 }],
          deliveryType: 'pickup',
        },
      });
      const orderId = JSON.parse(createRes.payload).order.id;

      // Complete order
      await app.inject({ method: 'PATCH', url: `/api/orders/${orderId}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'accepted' } });
      await app.inject({ method: 'PATCH', url: `/api/orders/${orderId}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'preparing' } });
      await app.inject({ method: 'PATCH', url: `/api/orders/${orderId}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'ready' } });
      await app.inject({ method: 'PATCH', url: `/api/orders/${orderId}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'completed' } });

      // Attempt completed -> preparing
      const termRes = await app.inject({
        method: 'PATCH',
        url: `/api/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: { status: 'preparing' },
      });

      expect(termRes.statusCode).toBe(400);
      expect(JSON.parse(termRes.payload).error.message).toContain('terminal');
    });

    it('SAME STATUS REJECTION: accepted -> accepted must be rejected (400 BAD_REQUEST)', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          items: [{ menuItemId: itemAId.toString(), quantity: 1 }],
          deliveryType: 'pickup',
        },
      });
      const orderId = JSON.parse(createRes.payload).order.id;

      await app.inject({ method: 'PATCH', url: `/api/orders/${orderId}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'accepted' } });

      const sameRes = await app.inject({
        method: 'PATCH',
        url: `/api/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: { status: 'accepted' },
      });

      expect(sameRes.statusCode).toBe(400);
      expect(JSON.parse(sameRes.payload).error.message).toContain('already in');
    });

    it('SUPER_ADMIN MUST OBEY STATE MACHINE: Super Admin attempting invalid jump received -> completed is rejected (400 BAD_REQUEST)', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          items: [{ menuItemId: itemAId.toString(), quantity: 1 }],
          deliveryType: 'pickup',
        },
      });
      const orderId = JSON.parse(createRes.payload).order.id;

      const adminJumpRes = await app.inject({
        method: 'PATCH',
        url: `/api/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${superAdminToken}` },
        payload: { status: 'completed' },
      });

      expect(adminJumpRes.statusCode).toBe(400);
    });
  });
});
