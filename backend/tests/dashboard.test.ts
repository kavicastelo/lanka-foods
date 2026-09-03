import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { type Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/infrastructure/database/index.js';
import { MenuCategory, MenuItem, Order, Restaurant, RestaurantApplication, Review, User } from '../src/models/index.js';

describe('Phase 12 — Dashboard Metrics & Analytics Integration & Security Tests', () => {
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

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDatabase(mongoServer.getUri());
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));

    app = await buildApp();
    await app.ready();

    // Create Test Users
    const cust = await User.create({ email: 'dashCust@lanka.fi', fullName: 'Dashboard Customer', role: 'CUSTOMER' });
    customerId = cust._id;

    const adminA = await User.create({ email: 'dashAdminA@lanka.fi', fullName: 'Dash Restaurant Admin A', role: 'RESTAURANT_ADMIN' });
    restAdminAId = adminA._id;

    const adminB = await User.create({ email: 'dashAdminB@lanka.fi', fullName: 'Dash Restaurant Admin B', role: 'RESTAURANT_ADMIN' });
    restAdminBId = adminB._id;

    const sAdmin = await User.create({ email: 'dashSuperAdmin@lanka.fi', fullName: 'Dash Super Admin', role: 'SUPER_ADMIN' });
    superAdminId = sAdmin._id;

    // Create Restaurants
    const restA = await Restaurant.create({
      name: 'Dash Test Restaurant A',
      slug: 'dash-test-restaurant-a',
      ownerId: restAdminAId,
      city: 'Helsinki',
      address: 'Dashboard Way 1',
      status: 'active',
    });
    restaurantAId = restA._id;

    const restB = await Restaurant.create({
      name: 'Dash Test Restaurant B',
      slug: 'dash-test-restaurant-b',
      ownerId: restAdminBId,
      city: 'Espoo',
      address: 'Dashboard Way 2',
      status: 'active',
    });
    restaurantBId = restB._id;

    // Create Category & Menu Item
    const catA = await MenuCategory.create({ restaurantId: restaurantAId, name: 'Curries' });
    const itemA = await MenuItem.create({
      restaurantId: restaurantAId,
      categoryId: catA._id,
      name: 'Chicken Curry',
      price: 1800, // 18.00 EUR
      isAvailable: true,
    });
    menuItemAId = itemA._id;

    // Create Pending Restaurant Application
    await RestaurantApplication.create({
      applicantUserId: customerId,
      businessName: 'Pending Sri Lankan Bakery',
      ownerName: 'Dashboard Customer',
      email: 'dashCust@lanka.fi',
      status: 'pending',
    });

    // Create Completed Order & Review for Restaurant A
    const orderA = await Order.create({
      orderNumber: 'LE-88801',
      restaurantId: restaurantAId,
      customerId,
      customerName: 'Dashboard Customer',
      customerPhone: '+358401112233',
      customerEmail: 'dashCust@lanka.fi',
      deliveryType: 'pickup',
      status: 'completed',
      subtotal: 1800,
      deliveryFee: 0,
      serviceFee: 0,
      total: 1800,
      placedAt: new Date(),
      items: [
        {
          menuItemId: menuItemAId,
          nameSnapshot: 'Chicken Curry',
          unitPrice: 1800,
          quantity: 2,
          subtotal: 3600,
        },
      ],
    });

    await Review.create({
      restaurantId: restaurantAId,
      orderId: orderA._id,
      authorId: customerId,
      authorName: 'Dashboard Customer',
      rating: 5,
      foodRating: 5,
      text: 'Delicious Kottu & Curry!',
      isVerified: true,
    });

    // Issue Tokens
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

  describe('Super Admin Dashboard Metrics', () => {
    it('GET /api/dashboard/metrics?scope=admin — Super Admin views global platform metrics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboard/metrics?scope=admin',
        headers: { authorization: `Bearer ${superAdminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload).data;
      expect(data.totalRestaurants).toBeGreaterThanOrEqual(2);
      expect(data.activeRestaurants).toBeGreaterThanOrEqual(2);
      expect(data.pendingApplications).toBeGreaterThanOrEqual(1);
      expect(data.totalOrders).toBeGreaterThanOrEqual(1);
      expect(data.totalReviews).toBeGreaterThanOrEqual(1);
      expect(data.avgRating).toBe(5);
      expect(data.monthlyData).toBeDefined();
      expect(data.restaurantRevenue).toBeDefined();
    });

    it('GET /api/admin/dashboard/metrics — Dedicated Super Admin endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/dashboard/metrics',
        headers: { authorization: `Bearer ${superAdminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload).data;
      expect(data.totalRestaurants).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Restaurant Admin Dashboard Metrics & Empty Data Handling', () => {
    it('GET /api/dashboard/metrics?scope=restaurant&restaurantId=... — Restaurant Admin A views metrics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/dashboard/metrics?scope=restaurant&restaurantId=${restaurantAId}`,
        headers: { authorization: `Bearer ${restAdminAToken}` },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload).data;
      expect(data.totalOrders).toBe(1);
      expect(data.completedOrders).toBe(1);
      expect(data.totalRevenue).toBe(18); // 1800 cents = 18.00 EUR
      expect(data.avgRating).toBe(5);
      expect(data.reviewCount).toBe(1);
      expect(data.menuItemCount).toBe(1);
      expect(data.topItems).toHaveLength(1);
      expect(data.topItems[0].name).toBe('Chicken Curry');
      expect(data.topItems[0].qty).toBe(2);
    });

    it('ZERO ORDERS EDGE CASE: New Restaurant B with zero orders returns valid numeric zeros without NaN/null', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/restaurants/${restaurantBId}/dashboard/metrics`,
        headers: { authorization: `Bearer ${restAdminBToken}` },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload).data;
      expect(data.totalOrders).toBe(0);
      expect(data.completedOrders).toBe(0);
      expect(data.totalRevenue).toBe(0);
      expect(data.avgRating).toBe(0);
      expect(data.reviewCount).toBe(0);
      expect(data.menuItemCount).toBe(0);
      expect(data.topItems).toEqual([]);
    });
  });

  describe('Adversarial Security & Cross-Restaurant Isolation Defenses', () => {
    it('UNAUTHENTICATED DEFENSE: Unauthenticated metrics requests must be rejected (401 UNAUTHORIZED)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/dashboard/metrics',
      });
      expect(response.statusCode).toBe(401);
    });

    it('CUSTOMER RBAC DEFENSE: Customer attempting to view admin dashboard metrics must be rejected (403 FORBIDDEN)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboard/metrics?scope=admin',
        headers: { authorization: `Bearer ${customerToken}` },
      });
      expect(response.statusCode).toBe(403);
    });

    it('CROSS-RESTAURANT DEFENSE: Restaurant Admin A attempting to access Restaurant B dashboard metrics must be rejected (403 FORBIDDEN)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/restaurants/${restaurantBId}/dashboard/metrics`,
        headers: { authorization: `Bearer ${restAdminAToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
