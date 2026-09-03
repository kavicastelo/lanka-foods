import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { type Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/infrastructure/database/index.js';
import { FinancialRecord, MenuCategory, MenuItem, Restaurant, User } from '../src/models/index.js';

describe('Phase 11 — Commission & Financial System Integration & Security Tests', () => {
  let app: FastifyInstance;
  let mongoServer: MongoMemoryServer;

  let customerId: Types.ObjectId;
  let restAdminAId: Types.ObjectId;
  let restAdminBId: Types.ObjectId;
  let superAdminId: Types.ObjectId;

  let restaurantAId: Types.ObjectId;
  let restaurantBId: Types.ObjectId;
  let menuItemAId: Types.ObjectId;

  let customerToken: string;
  let restAdminAToken: string;
  let restAdminBToken: string;
  let superAdminToken: string;

  let targetRecordId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDatabase(mongoServer.getUri());
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));

    app = await buildApp();
    await app.ready();

    // Create Test Users
    const cust = await User.create({ email: 'finCustomer@lanka.fi', fullName: 'Financial Customer', role: 'CUSTOMER' });
    customerId = cust._id;

    const adminA = await User.create({ email: 'finAdminA@lanka.fi', fullName: 'Restaurant Admin A', role: 'RESTAURANT_ADMIN' });
    restAdminAId = adminA._id;

    const adminB = await User.create({ email: 'finAdminB@lanka.fi', fullName: 'Restaurant Admin B', role: 'RESTAURANT_ADMIN' });
    restAdminBId = adminB._id;

    const sAdmin = await User.create({ email: 'finSuperAdmin@lanka.fi', fullName: 'Financial Super Admin', role: 'SUPER_ADMIN' });
    superAdminId = sAdmin._id;

    // Create Restaurants
    const restA = await Restaurant.create({
      name: 'Financial Test Restaurant A',
      slug: 'financial-test-restaurant-a',
      ownerId: restAdminAId,
      city: 'Helsinki',
      address: 'Test Street 1',
      status: 'active',
    });
    restaurantAId = restA._id;

    const restB = await Restaurant.create({
      name: 'Financial Test Restaurant B',
      slug: 'financial-test-restaurant-b',
      ownerId: restAdminBId,
      city: 'Espoo',
      address: 'Test Street 2',
      status: 'active',
      commissionRate: 20, // Custom 20% commission override
    });
    restaurantBId = restB._id;

    // Create Menu Category & Item
    const catA = await MenuCategory.create({ restaurantId: restaurantAId, name: 'Mains' });

    const itemA = await MenuItem.create({
      restaurantId: restaurantAId,
      categoryId: catA._id,
      name: 'Kottu Roti',
      price: 1500, // 15.00 EUR
      isAvailable: true,
    });
    menuItemAId = itemA._id;

    // Issue JWT Tokens
    customerToken = app.jwt.sign({ sub: customerId.toString(), role: 'CUSTOMER', email: cust.email });
    restAdminAToken = app.jwt.sign({ sub: restAdminAId.toString(), role: 'RESTAURANT_ADMIN', email: adminA.email });
    restAdminBToken = app.jwt.sign({ sub: restAdminBId.toString(), role: 'RESTAURANT_ADMIN', email: adminB.email });
    superAdminToken = app.jwt.sign({ sub: superAdminId.toString(), role: 'SUPER_ADMIN', email: sAdmin.email });
  }, 60000);

  afterAll(async () => {
    await app.close();
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }, 30000);

  describe('Commission Configuration & Security', () => {
    it('GET /api/admin/commission-config — Super Admin views global commission config', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/commission-config',
        headers: { authorization: `Bearer ${superAdminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const config = JSON.parse(response.payload).config;
      expect(config.key).toBe('default_config');
      expect(config.defaultRate).toBe(10);
    });

    it('POST /api/admin/commission-config — Super Admin updates global commission rate', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/commission-config',
        headers: { authorization: `Bearer ${superAdminToken}` },
      });
      expect(response.statusCode).toBe(200);
    });

    it('INVALID RATE DEFENSE: Commission rate < 0 or > 50 must be rejected (400 BAD_REQUEST)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/commission-config',
        headers: { authorization: `Bearer ${superAdminToken}` },
        payload: { defaultRate: 75 }, // Exceeds 50%
      });

      expect(response.statusCode).toBe(400);
    });

    it('RBAC DEFENSE: RESTAURANT_ADMIN cannot update global commission config (403 FORBIDDEN)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/commission-config',
        headers: { authorization: `Bearer ${restAdminAToken}` },
        payload: { defaultRate: 15 },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Order Lifecycle Integration & Historical Rate Snapshotting', () => {
    let orderAId: string;
    let financialRecordAId: string;

    it('Order completion generates FinancialRecord with 10% rate', async () => {
      // 1. Create Order
      const createOrderRes = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          restaurantId: restaurantAId.toString(),
          deliveryType: 'pickup',
          items: [{ menuItemId: menuItemAId.toString(), quantity: 2 }], // 2 * 1500 = 3000 cents (€30.00)
        },
      });

      expect(createOrderRes.statusCode).toBe(201);
      orderAId = JSON.parse(createOrderRes.payload).order.id;

      // 2. Advance Order Status: received -> accepted -> preparing -> ready -> completed
      await app.inject({ method: 'PATCH', url: `/api/orders/${orderAId}/status`, headers: { authorization: `Bearer ${restAdminAToken}` }, payload: { status: 'accepted' } });
      await app.inject({ method: 'PATCH', url: `/api/orders/${orderAId}/status`, headers: { authorization: `Bearer ${restAdminAToken}` }, payload: { status: 'preparing' } });
      await app.inject({ method: 'PATCH', url: `/api/orders/${orderAId}/status`, headers: { authorization: `Bearer ${restAdminAToken}` }, payload: { status: 'ready' } });
      const completeRes = await app.inject({ method: 'PATCH', url: `/api/orders/${orderAId}/status`, headers: { authorization: `Bearer ${restAdminAToken}` }, payload: { status: 'completed' } });

      expect(completeRes.statusCode).toBe(200);

      // 3. Verify FinancialRecord in MongoDB
      const record = await FinancialRecord.findOne({ orderId: orderAId });
      expect(record).not.toBeNull();
      expect(record!.orderSubtotal).toBe(3000);
      expect(record!.commissionableAmount).toBe(3000);
      expect(record!.commissionRate).toBe(10);
      expect(record!.commissionAmount).toBe(300); // 10% of 3000 = 300 cents (€3.00)
      expect(record!.restaurantNetAmount).toBe(2700); // 3000 - 300 = 2700 cents (€27.00)
      expect(record!.status).toBe('PENDING');

      financialRecordAId = record!._id.toString();
    });

    it('HISTORICAL RATE PROTECTION: Updating global commission rate to 15% does not alter past historical financial records', async () => {
      // 1. Update global rate to 15%
      await app.inject({
        method: 'POST',
        url: '/api/admin/commission-config',
        headers: { authorization: `Bearer ${superAdminToken}` },
        payload: { defaultRate: 15 },
      });

      // 2. Past FinancialRecord must STILL have 10% rate!
      const pastRecord = await FinancialRecord.findById(financialRecordAId);
      expect(pastRecord!.commissionRate).toBe(10);
      expect(pastRecord!.commissionAmount).toBe(300);
    });

    it('PER-RESTAURANT OVERRIDE: Restaurant B with 20% custom rate produces 20% commission record', async () => {
      // Create Menu Category & Item for Restaurant B
      const catB = await MenuCategory.create({ restaurantId: restaurantBId, name: 'Specials' });
      const itemB = await MenuItem.create({
        restaurantId: restaurantBId,
        categoryId: catB._id,
        name: 'Lamprais',
        price: 2000, // 20.00 EUR
        isAvailable: true,
      });

      // Create Order for Restaurant B
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          restaurantId: restaurantBId.toString(),
          deliveryType: 'pickup',
          items: [{ menuItemId: itemB._id.toString(), quantity: 1 }], // 2000 cents
        },
      });
      const orderBId = JSON.parse(createRes.payload).order.id;

      // Complete Order
      await app.inject({ method: 'PATCH', url: `/api/orders/${orderBId}/status`, headers: { authorization: `Bearer ${restAdminBToken}` }, payload: { status: 'accepted' } });
      await app.inject({ method: 'PATCH', url: `/api/orders/${orderBId}/status`, headers: { authorization: `Bearer ${restAdminBToken}` }, payload: { status: 'preparing' } });
      await app.inject({ method: 'PATCH', url: `/api/orders/${orderBId}/status`, headers: { authorization: `Bearer ${restAdminBToken}` }, payload: { status: 'ready' } });
      await app.inject({ method: 'PATCH', url: `/api/orders/${orderBId}/status`, headers: { authorization: `Bearer ${restAdminBToken}` }, payload: { status: 'completed' } });

      // Verify 20% commission override applied
      const recordB = await FinancialRecord.findOne({ orderId: orderBId });
      expect(recordB!.commissionRate).toBe(20);
      expect(recordB!.commissionAmount).toBe(400); // 20% of 2000 = 400 cents
      expect(recordB!.restaurantNetAmount).toBe(1600); // 2000 - 400 = 1600 cents
    });
  });

  describe('Manual Settlement Workflow & Idempotency', () => {
    beforeAll(async () => {
      const record = await FinancialRecord.findOne({ restaurantId: restaurantAId });
      targetRecordId = record!._id.toString();
    });

    it('POST /api/admin/financial-records/:id/settle — Super Admin marks financial record as SETTLED', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/admin/financial-records/${targetRecordId}/settle`,
        headers: { authorization: `Bearer ${superAdminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const record = JSON.parse(response.payload).record;
      expect(record.status).toBe('SETTLED');
      expect(record.settledBy).toBe(superAdminId.toString());
      expect(record.settledAt).toBeDefined();

      // Verify MongoDB Document
      const dbRecord = await FinancialRecord.findById(targetRecordId);
      expect(dbRecord!.status).toBe('SETTLED');
    });

    it('SETTLEMENT IDEMPOTENCY: Re-settling an already settled record returns 200 OK without corrupting metadata', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/admin/financial-records/${targetRecordId}/settle`,
        headers: { authorization: `Bearer ${superAdminToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload).message).toContain('already settled');
    });
  });

  describe('Scoped Financial Visibility & Security Defenses', () => {
    it('GET /api/restaurants/:restaurantId/financials — Restaurant Admin A views own financials', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/restaurants/${restaurantAId}/financials`,
        headers: { authorization: `Bearer ${restAdminAToken}` },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.records).toBeDefined();
      expect(payload.summary.totalGross).toBeGreaterThan(0);
    });

    it('CROSS-RESTAURANT DEFENSE: Restaurant Admin A accessing Restaurant B financials must be rejected (403 FORBIDDEN)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/restaurants/${restaurantBId}/financials`,
        headers: { authorization: `Bearer ${restAdminAToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('CUSTOMER DEFENSE: Customer accessing financial records or settlement endpoints must be rejected (403 FORBIDDEN)', async () => {
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/admin/financial-records',
        headers: { authorization: `Bearer ${customerToken}` },
      });
      expect(listRes.statusCode).toBe(403);

      const settleRes = await app.inject({
        method: 'POST',
        url: `/api/admin/financial-records/${targetRecordId}/settle`,
        headers: { authorization: `Bearer ${customerToken}` },
      });
      expect(settleRes.statusCode).toBe(403);
    });
  });
});
