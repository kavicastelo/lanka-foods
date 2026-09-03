import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { type Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/infrastructure/database/index.js';
import { GlobalCategory, Restaurant, User } from '../src/models/index.js';

describe('Phase 4 — Restaurant & Global Category Services Integration & Security Tests', () => {
  let app: FastifyInstance;
  let mongoServer: MongoMemoryServer;

  let ownerAId: Types.ObjectId;
  let ownerBId: Types.ObjectId;
  let customerId: Types.ObjectId;
  let superAdminId: Types.ObjectId;

  let ownerAToken: string;
  let ownerBToken: string;
  let customerToken: string;
  let superAdminToken: string;

  let restaurantAId: Types.ObjectId;
  let restaurantBId: Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDatabase(mongoServer.getUri());
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));

    app = await buildApp();
    await app.ready();

    // Create Test Users
    const ownerA = await User.create({ email: 'ownera@galle.fi', fullName: 'Owner A', role: 'RESTAURANT_ADMIN' });
    ownerAId = ownerA._id;

    const ownerB = await User.create({ email: 'ownerb@kandy.fi', fullName: 'Owner B', role: 'RESTAURANT_ADMIN' });
    ownerBId = ownerB._id;

    const customer = await User.create({ email: 'customer@lanka.fi', fullName: 'Customer User', role: 'CUSTOMER' });
    customerId = customer._id;

    const superAdmin = await User.create({ email: 'admin@lanka.fi', fullName: 'Super Admin', role: 'SUPER_ADMIN' });
    superAdminId = superAdmin._id;

    // Issue Tokens
    ownerAToken = app.jwt.sign({ sub: ownerAId.toString(), role: 'RESTAURANT_ADMIN', email: ownerA.email });
    ownerBToken = app.jwt.sign({ sub: ownerBId.toString(), role: 'RESTAURANT_ADMIN', email: ownerB.email });
    customerToken = app.jwt.sign({ sub: customerId.toString(), role: 'CUSTOMER', email: customer.email });
    superAdminToken = app.jwt.sign({ sub: superAdminId.toString(), role: 'SUPER_ADMIN', email: superAdmin.email });

    // Create Test Restaurants
    const restA = await Restaurant.create({
      name: 'Galle Garden Kitchen',
      slug: 'galle-garden-kitchen',
      ownerId: ownerAId,
      city: 'Helsinki',
      address: 'Mannerheimintie 10',
      cuisines: ['Rice & Curry', 'Kottu'],
      minOrder: 1500, // €15.00
      deliveryFee: 350, // €3.50
      status: 'active',
      commissionRate: 15,
    });
    restaurantAId = restA._id;

    const restB = await Restaurant.create({
      name: 'Kandy Spice House',
      slug: 'kandy-spice-house',
      ownerId: ownerBId,
      city: 'Espoo',
      address: 'Otaniemi 5',
      cuisines: ['Kottu', 'Hoppers'],
      minOrder: 1200, // €12.00
      deliveryFee: 250, // €2.50
      status: 'active',
      commissionRate: 12,
    });
    restaurantBId = restB._id;

    // Inactive Restaurant
    await Restaurant.create({
      name: 'Pending Restaurant',
      slug: 'pending-restaurant',
      ownerId: ownerAId,
      city: 'Vantaa',
      minOrder: 1000,
      deliveryFee: 200,
      status: 'pending',
    });

    // Create Global Categories
    await GlobalCategory.create({ name: 'Rice & Curry', slug: 'rice-and-curry', sortOrder: 1, isActive: true });
    await GlobalCategory.create({ name: 'Kottu Roti', slug: 'kottu-roti', sortOrder: 2, isActive: true });
  }, 60000);

  afterAll(async () => {
    await app.close();
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }, 30000);

  describe('Public Restaurant Discovery APIs', () => {
    it('GET /api/restaurants — should list only active restaurants with pagination and exclude sensitive fields', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/restaurants?page=1&limit=10',
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.data).toHaveLength(2); // Only 2 active restaurants (pending is hidden)
      expect(payload.pagination.total).toBe(2);

      const firstItem = payload.data[0];
      expect(firstItem.name).toBeDefined();
      expect(firstItem.slug).toBeDefined();
      // Verify security DTO exclusion: sensitive internal fields must be absent
      expect(firstItem.ownerId).toBeUndefined();
      expect(firstItem.commissionRate).toBeUndefined();
    });

    it('GET /api/restaurants — should filter restaurants by city and cuisine safely', async () => {
      const cityRes = await app.inject({
        method: 'GET',
        url: '/api/restaurants?city=Helsinki',
      });
      expect(cityRes.statusCode).toBe(200);
      const cityData = JSON.parse(cityRes.payload);
      expect(cityData.data).toHaveLength(1);
      expect(cityData.data[0].slug).toBe('galle-garden-kitchen');

      const cuisineRes = await app.inject({
        method: 'GET',
        url: '/api/restaurants?cuisine=Hoppers',
      });
      expect(cuisineRes.statusCode).toBe(200);
      const cuisineData = JSON.parse(cuisineRes.payload);
      expect(cuisineData.data).toHaveLength(1);
      expect(cuisineData.data[0].slug).toBe('kandy-spice-house');
    });

    it('GET /api/restaurants — should execute safe, case-insensitive search', async () => {
      const searchRes = await app.inject({
        method: 'GET',
        url: '/api/restaurants?search=galle',
      });

      expect(searchRes.statusCode).toBe(200);
      const payload = JSON.parse(searchRes.payload);
      expect(payload.data).toHaveLength(1);
      expect(payload.data[0].slug).toBe('galle-garden-kitchen');
    });

    it('GET /api/restaurants — should cap excessive limit parameter to 50', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/restaurants?limit=500',
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.pagination.limit).toBe(50);
    });

    it('GET /api/restaurants/:slug — should return active restaurant storefront detail by slug', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/restaurants/galle-garden-kitchen',
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.restaurant.slug).toBe('galle-garden-kitchen');
      expect(payload.restaurant.ownerId).toBeUndefined(); // Excluded from public detail
    });

    it('GET /api/restaurants/:slug — should return 404 for non-existent or inactive restaurant slugs', async () => {
      const notFoundRes = await app.inject({
        method: 'GET',
        url: '/api/restaurants/non-existent-slug',
      });
      expect(notFoundRes.statusCode).toBe(404);

      const pendingRes = await app.inject({
        method: 'GET',
        url: '/api/restaurants/pending-restaurant',
      });
      expect(pendingRes.statusCode).toBe(404);
    });
  });

  describe('Restaurant Owner Operations & Ownership Authorization Security', () => {
    it('GET /api/restaurant/me — should return authenticated owner restaurant', async () => {
      const resA = await app.inject({
        method: 'GET',
        url: '/api/restaurant/me',
        headers: { authorization: `Bearer ${ownerAToken}` },
      });

      expect(resA.statusCode).toBe(200);
      const payloadA = JSON.parse(resA.payload);
      expect(payloadA.restaurant.slug).toBe('galle-garden-kitchen');
      expect(payloadA.restaurant.ownerId).toBe(ownerAId.toString());
      expect(payloadA.restaurant.commissionRate).toBe(15);

      const resB = await app.inject({
        method: 'GET',
        url: '/api/restaurant/me',
        headers: { authorization: `Bearer ${ownerBToken}` },
      });

      expect(resB.statusCode).toBe(200);
      const payloadB = JSON.parse(resB.payload);
      expect(payloadB.restaurant.slug).toBe('kandy-spice-house');
      expect(payloadB.restaurant.ownerId).toBe(ownerBId.toString());
    });

    it('GET /api/restaurant/me — should ignore client identity spoofing attempts (?ownerId=)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/restaurant/me?ownerId=${ownerBId.toString()}`,
        headers: { authorization: `Bearer ${ownerAToken}` },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.restaurant.ownerId).toBe(ownerAId.toString()); // Returns Owner A restaurant only
    });

    it('PATCH /api/restaurant/settings — should allow authenticated owner to update permitted settings', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/restaurant/settings',
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: {
          description: 'Updated authentic Sri Lankan cuisine',
          minOrder: 1800, // €18.00
          deliveryFee: 400, // €4.00
          isOpen: false,
        },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.restaurant.description).toBe('Updated authentic Sri Lankan cuisine');
      expect(payload.restaurant.minOrder).toBe(1800);

      // Verify in DB
      const dbRest = await Restaurant.findById(restaurantAId);
      expect(dbRest!.minOrder).toBe(1800);
      expect(dbRest!.isOpen).toBe(false);
    });

    it('PATCH /api/restaurant/settings — Mass Assignment Protection: should ignore attempts to mutate protected fields (ownerId, commissionRate, status)', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/restaurant/settings',
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: {
          name: 'Galle Garden Kitchen Refreshed',
          ownerId: customerId.toString(), // Attacker tries to re-assign owner
          commissionRate: 0, // Attacker tries to wipe commission
          status: 'rejected', // Attacker tries to manipulate status
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify protected fields remained unchanged in MongoDB
      const dbRest = await Restaurant.findById(restaurantAId);
      expect(dbRest!.name).toBe('Galle Garden Kitchen Refreshed');
      expect(dbRest!.ownerId.toString()).toBe(ownerAId.toString()); // Owner unchanged
      expect(dbRest!.commissionRate).toBe(15); // Commission rate unchanged
      expect(dbRest!.status).toBe('active'); // Status unchanged
    });

    it('Cross-Restaurant Ownership Defense: Owner A cannot modify Owner B restaurant', async () => {
      // Owner A calls settings update. Server works strictly on Owner A's restaurant. Owner B's restaurant is unaffected.
      await app.inject({
        method: 'PATCH',
        url: '/api/restaurant/settings',
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: {
          name: 'Owner A Self Modification',
        },
      });

      const restB = await Restaurant.findById(restaurantBId);
      expect(restB!.name).toBe('Kandy Spice House'); // Restaurant B unchanged!
    });

    it('PATCH /api/restaurant/settings — should return 403 FORBIDDEN for CUSTOMER accounts', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/restaurant/settings',
        headers: { authorization: `Bearer ${customerToken}` },
        payload: { name: 'Customer Hack' },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Global Category Services & Admin CRUD Security Tests', () => {
    it('GET /api/categories — should return active global categories sorted by sortOrder', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/categories',
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.categories.length).toBeGreaterThanOrEqual(2);
      expect(payload.categories[0].slug).toBe('rice-and-curry');
    });

    it('POST /api/admin/categories — should allow SUPER_ADMIN and block CUSTOMER/RESTAURANT_ADMIN (403 FORBIDDEN)', async () => {
      const custRes = await app.inject({
        method: 'POST',
        url: '/api/admin/categories',
        headers: { authorization: `Bearer ${customerToken}` },
        payload: { name: 'Hoppers', slug: 'hoppers' },
      });
      expect(custRes.statusCode).toBe(403);

      const ownerRes = await app.inject({
        method: 'POST',
        url: '/api/admin/categories',
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: { name: 'Hoppers', slug: 'hoppers' },
      });
      expect(ownerRes.statusCode).toBe(403);

      const adminRes = await app.inject({
        method: 'POST',
        url: '/api/admin/categories',
        headers: { authorization: `Bearer ${superAdminToken}` },
        payload: { name: 'Hoppers', slug: 'hoppers', sortOrder: 3 },
      });
      expect(adminRes.statusCode).toBe(201);
      const payload = JSON.parse(adminRes.payload);
      expect(payload.category.name).toBe('Hoppers');
    });

    it('POST /api/admin/categories — should reject duplicate category slug (409 CONFLICT)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/categories',
        headers: { authorization: `Bearer ${superAdminToken}` },
        payload: { name: 'Duplicate Hoppers', slug: 'hoppers' },
      });

      expect(response.statusCode).toBe(409);
    });

    it('PATCH /api/admin/categories/:id — should allow SUPER_ADMIN to update category', async () => {
      const cat = await GlobalCategory.findOne({ slug: 'hoppers' });
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/admin/categories/${cat!._id.toString()}`,
        headers: { authorization: `Bearer ${superAdminToken}` },
        payload: { name: 'Fresh Hoppers & String Hoppers' },
      });

      expect(response.statusCode).toBe(200);
      const updatedCat = await GlobalCategory.findById(cat!._id);
      expect(updatedCat!.name).toBe('Fresh Hoppers & String Hoppers');
    });

    it('DELETE /api/admin/categories/:id — should allow SUPER_ADMIN to soft-deactivate category', async () => {
      const cat = await GlobalCategory.findOne({ slug: 'hoppers' });
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/admin/categories/${cat!._id.toString()}`,
        headers: { authorization: `Bearer ${superAdminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const updatedCat = await GlobalCategory.findById(cat!._id);
      expect(updatedCat!.isActive).toBe(false);
    });
  });
});
