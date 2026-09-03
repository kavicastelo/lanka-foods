import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { type Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/infrastructure/database/index.js';
import { Favorite, MenuCategory, MenuItem, Restaurant, User } from '../src/models/index.js';

describe('Phase 9 — Favorites Service Integration & Security Tests', () => {
  let app: FastifyInstance;
  let mongoServer: MongoMemoryServer;

  let customerAId: Types.ObjectId;
  let customerBId: Types.ObjectId;
  let ownerId: Types.ObjectId;

  let customerAToken: string;
  let customerBToken: string;

  let restaurantId: Types.ObjectId;
  let menuItemId: Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDatabase(mongoServer.getUri());
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));

    app = await buildApp();
    await app.ready();

    // Create Test Users
    const custA = await User.create({ email: 'favcustA@lanka.fi', fullName: 'Fav Customer A', role: 'CUSTOMER' });
    customerAId = custA._id;

    const custB = await User.create({ email: 'favcustB@lanka.fi', fullName: 'Fav Customer B', role: 'CUSTOMER' });
    customerBId = custB._id;

    const owner = await User.create({ email: 'favowner@lanka.fi', fullName: 'Fav Owner', role: 'RESTAURANT_ADMIN' });
    ownerId = owner._id;

    // Issue JWT Tokens
    customerAToken = app.jwt.sign({ sub: customerAId.toString(), role: 'CUSTOMER', email: custA.email });
    customerBToken = app.jwt.sign({ sub: customerBId.toString(), role: 'CUSTOMER', email: custB.email });

    // Create Test Restaurant & Menu Item
    const rest = await Restaurant.create({
      name: 'Nuwara Eliya Tea Garden',
      slug: 'nuwara-eliya-tea-garden',
      ownerId: ownerId,
      city: 'Helsinki',
      minOrder: 1000,
      deliveryFee: 300,
      pickup: true,
      delivery: true,
      isOpen: true,
      status: 'active',
    });
    restaurantId = rest._id;

    const cat = await MenuCategory.create({ restaurantId: restaurantId, name: 'Beverages', sortOrder: 1 });
    const item = await MenuItem.create({
      restaurantId: restaurantId,
      categoryId: cat._id,
      name: 'Ceylon Black Tea',
      price: 450,
      isAvailable: true,
    });
    menuItemId = item._id;
  }, 60000);

  afterAll(async () => {
    await app.close();
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }, 30000);

  describe('Happy Path Restaurant & Menu Item Favorites', () => {
    it('POST /api/favorites/restaurants/:restaurantId — should add restaurant favorite', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/favorites/restaurants/${restaurantId}`,
        headers: { authorization: `Bearer ${customerAToken}` },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.favorited).toBe(true);
      expect(payload.favorite.restaurantId).toBe(restaurantId.toString());

      // Check DB
      const dbFav = await Favorite.findOne({ userId: customerAId, restaurantId });
      expect(dbFav).not.toBeNull();
    });

    it('GET /api/favorites/status — should return favorited status true for customer A', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/favorites/status?restaurantId=${restaurantId}`,
        headers: { authorization: `Bearer ${customerAToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload).isFavorited).toBe(true);
    });

    it('GET /api/favorites — should return list of customer A favorites with populated restaurant details', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/favorites',
        headers: { authorization: `Bearer ${customerAToken}` },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.restaurants).toContain(restaurantId.toString());
      expect(payload.raw[0].restaurant.name).toBe('Nuwara Eliya Tea Garden');
    });

    it('DELETE /api/favorites/restaurants/:restaurantId — should remove restaurant favorite', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/favorites/restaurants/${restaurantId}`,
        headers: { authorization: `Bearer ${customerAToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload).favorited).toBe(false);

      const dbFav = await Favorite.findOne({ userId: customerAId, restaurantId });
      expect(dbFav).toBeNull();
    });

    it('POST & DELETE /api/favorites/menu-items/:menuItemId — should add and remove menu item favorite', async () => {
      // Add Menu Item Favorite
      const addRes = await app.inject({
        method: 'POST',
        url: `/api/favorites/menu-items/${menuItemId}`,
        headers: { authorization: `Bearer ${customerAToken}` },
      });

      expect(addRes.statusCode).toBe(200);
      expect(JSON.parse(addRes.payload).favorited).toBe(true);

      // Verify in GET /api/favorites
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/favorites',
        headers: { authorization: `Bearer ${customerAToken}` },
      });
      const payload = JSON.parse(listRes.payload);
      expect(payload.items).toContain(menuItemId.toString());
      expect(payload.raw[0].menuItem.name).toBe('Ceylon Black Tea');

      // Delete Menu Item Favorite
      const delRes = await app.inject({
        method: 'DELETE',
        url: `/api/favorites/menu-items/${menuItemId}`,
        headers: { authorization: `Bearer ${customerAToken}` },
      });
      expect(delRes.statusCode).toBe(200);

      const dbFav = await Favorite.findOne({ userId: customerAId, menuItemId });
      expect(dbFav).toBeNull();
    });

    it('POST /api/favorites/toggle — should toggle favorite status on and off cleanly', async () => {
      // Toggle ON
      const onRes = await app.inject({
        method: 'POST',
        url: '/api/favorites/toggle',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: { targetType: 'restaurant', targetId: restaurantId.toString() },
      });
      expect(onRes.statusCode).toBe(200);
      expect(JSON.parse(onRes.payload).favorited).toBe(true);

      // Toggle OFF
      const offRes = await app.inject({
        method: 'POST',
        url: '/api/favorites/toggle',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: { targetType: 'restaurant', targetId: restaurantId.toString() },
      });
      expect(offRes.statusCode).toBe(200);
      expect(JSON.parse(offRes.payload).favorited).toBe(false);
    });
  });

  describe('Adversarial Security & Isolation Defenses', () => {
    it('UNAUTHENTICATED DEFENSE: Requests without JWT must be rejected (401 UNAUTHORIZED)', async () => {
      const getRes = await app.inject({ method: 'GET', url: '/api/favorites' });
      expect(getRes.statusCode).toBe(401);

      const postRes = await app.inject({
        method: 'POST',
        url: `/api/favorites/restaurants/${restaurantId}`,
      });
      expect(postRes.statusCode).toBe(401);
    });

    it('CROSS-USER ISOLATION DEFENSE: Customer B deleting favorite does not affect Customer A favorite', async () => {
      // Customer A favorites restaurant
      await app.inject({
        method: 'POST',
        url: `/api/favorites/restaurants/${restaurantId}`,
        headers: { authorization: `Bearer ${customerAToken}` },
      });

      // Customer B attempts DELETE /api/favorites/restaurants/:restaurantId
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/favorites/restaurants/${restaurantId}`,
        headers: { authorization: `Bearer ${customerBToken}` },
      });
      expect(deleteRes.statusCode).toBe(200);

      // Verify Customer A's favorite STILL exists in MongoDB!
      const dbFavA = await Favorite.findOne({ userId: customerAId, restaurantId });
      expect(dbFavA).not.toBeNull();

      // Clean up
      await Favorite.deleteOne({ userId: customerAId, restaurantId });
    });

    it('NONEXISTENT TARGET DEFENSE: Favoriting a non-existent restaurant or menu item returns 404 NOT_FOUND', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await app.inject({
        method: 'POST',
        url: `/api/favorites/restaurants/${fakeId}`,
        headers: { authorization: `Bearer ${customerAToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('MALFORMED ID DEFENSE: Submitting malformed ObjectId returns 400 BAD_REQUEST', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/favorites/restaurants/invalid-id-format',
        headers: { authorization: `Bearer ${customerAToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('DATABASE CONCURRENCY DUPLICATE FAVORITE DEFENSE: Concurrent requests do not create duplicate database records', async () => {
      // Trigger simultaneous favorite calls for same user & restaurant
      const [res1, res2] = await Promise.all([
        app.inject({
          method: 'POST',
          url: `/api/favorites/restaurants/${restaurantId}`,
          headers: { authorization: `Bearer ${customerAToken}` },
        }),
        app.inject({
          method: 'POST',
          url: `/api/favorites/restaurants/${restaurantId}`,
          headers: { authorization: `Bearer ${customerAToken}` },
        }),
      ]);

      expect(res1.statusCode).toBe(200);
      expect(res2.statusCode).toBe(200);

      // Verify exactly 1 favorite document exists in MongoDB
      const dbFavs = await Favorite.find({ userId: customerAId, restaurantId });
      expect(dbFavs).toHaveLength(1);
    });
  });
});
