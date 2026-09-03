import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { type Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/infrastructure/database/index.js';
import { MenuCategory, MenuItem, Restaurant, User } from '../src/models/index.js';

describe('Phase 5 — Menu Management & Catalog Services Integration & Security Tests', () => {
  let app: FastifyInstance;
  let mongoServer: MongoMemoryServer;

  let ownerAId: Types.ObjectId;
  let ownerBId: Types.ObjectId;
  let customerId: Types.ObjectId;

  let ownerAToken: string;
  let ownerBToken: string;
  let customerToken: string;

  let restaurantAId: Types.ObjectId;
  let restaurantBId: Types.ObjectId;

  let categoryAId: Types.ObjectId;
  let categoryBId: Types.ObjectId;

  let itemAId: Types.ObjectId;
  let itemBId: Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDatabase(mongoServer.getUri());
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));

    app = await buildApp();
    await app.ready();

    // Create Test Users
    const ownerA = await User.create({ email: 'menuownera@galle.fi', fullName: 'Menu Owner A', role: 'RESTAURANT_ADMIN' });
    ownerAId = ownerA._id;

    const ownerB = await User.create({ email: 'menuownerb@kandy.fi', fullName: 'Menu Owner B', role: 'RESTAURANT_ADMIN' });
    ownerBId = ownerB._id;

    const customer = await User.create({ email: 'menucustomer@lanka.fi', fullName: 'Menu Customer', role: 'CUSTOMER' });
    customerId = customer._id;

    // Issue JWT Tokens
    ownerAToken = app.jwt.sign({ sub: ownerAId.toString(), role: 'RESTAURANT_ADMIN', email: ownerA.email });
    ownerBToken = app.jwt.sign({ sub: ownerBId.toString(), role: 'RESTAURANT_ADMIN', email: ownerB.email });
    customerToken = app.jwt.sign({ sub: customerId.toString(), role: 'CUSTOMER', email: customer.email });

    // Create Test Restaurants
    const restA = await Restaurant.create({
      name: 'Galle Seafood Palace',
      slug: 'galle-seafood-palace',
      ownerId: ownerAId,
      city: 'Helsinki',
      minOrder: 1500,
      deliveryFee: 350,
      status: 'active',
    });
    restaurantAId = restA._id;

    const restB = await Restaurant.create({
      name: 'Kandy Curry House',
      slug: 'kandy-curry-house',
      ownerId: ownerBId,
      city: 'Espoo',
      minOrder: 1200,
      deliveryFee: 250,
      status: 'active',
    });
    restaurantBId = restB._id;

    // Create Categories
    const catA = await MenuCategory.create({
      restaurantId: restaurantAId,
      name: 'Mains',
      sortOrder: 1,
    });
    categoryAId = catA._id;

    const catB = await MenuCategory.create({
      restaurantId: restaurantBId,
      name: 'Specialties',
      sortOrder: 1,
    });
    categoryBId = catB._id;

    // Create Menu Items
    const itemA = await MenuItem.create({
      restaurantId: restaurantAId,
      categoryId: categoryAId,
      name: 'Devilled Crab',
      description: 'Spicy Sri Lankan style devilled crab',
      price: 1850, // €18.50 in cents
      isAvailable: true,
      isVegetarian: false,
    });
    itemAId = itemA._id;

    // Unavailable item for Restaurant A
    await MenuItem.create({
      restaurantId: restaurantAId,
      categoryId: categoryAId,
      name: 'Seasonal Lobster Curry',
      description: 'Out of stock seasonal dish',
      price: 2500,
      isAvailable: false,
    });

    const itemB = await MenuItem.create({
      restaurantId: restaurantBId,
      categoryId: categoryBId,
      name: 'Kandy Mutton Kottu',
      description: 'Traditional chopped roti with mutton',
      price: 1400,
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

  describe('Public Menu Catalog APIs', () => {
    it('GET /api/restaurants/:slug/menu — should return active menu categories and available items only', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/restaurants/galle-seafood-palace/menu',
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.restaurant.slug).toBe('galle-seafood-palace');
      expect(payload.categories).toHaveLength(1);

      const mainsCat = payload.categories[0];
      expect(mainsCat.name).toBe('Mains');
      // Public menu should include available item ("Devilled Crab") and exclude unavailable item ("Seasonal Lobster Curry")
      expect(mainsCat.items).toHaveLength(1);
      expect(mainsCat.items[0].name).toBe('Devilled Crab');
      expect(mainsCat.items[0].price).toBe(1850);
    });

    it('GET /api/restaurants/:slug/menu — should return 404 for non-existent restaurant slug', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/restaurants/does-not-exist-slug/menu',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Menu Category Owner Management & Authorization', () => {
    it('GET /api/restaurant/menu-categories — should list categories for authenticated owner', async () => {
      const resA = await app.inject({
        method: 'GET',
        url: '/api/restaurant/menu-categories',
        headers: { authorization: `Bearer ${ownerAToken}` },
      });

      expect(resA.statusCode).toBe(200);
      const payloadA = JSON.parse(resA.payload);
      expect(payloadA.categories).toHaveLength(1);
      expect(payloadA.categories[0].name).toBe('Mains');

      const resB = await app.inject({
        method: 'GET',
        url: '/api/restaurant/menu-categories',
        headers: { authorization: `Bearer ${ownerBToken}` },
      });

      expect(resB.statusCode).toBe(200);
      const payloadB = JSON.parse(resB.payload);
      expect(payloadB.categories).toHaveLength(1);
      expect(payloadB.categories[0].name).toBe('Specialties');
    });

    it('POST /api/restaurant/menu-categories — should allow owner to create a new category', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/restaurant/menu-categories',
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: { name: 'Desserts', sortOrder: 2 },
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.payload);
      expect(payload.category.name).toBe('Desserts');
      expect(payload.category.restaurantId).toBe(restaurantAId.toString());
    });

    it('POST /api/restaurant/menu-categories — should reject duplicate category names for same restaurant (409 CONFLICT)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/restaurant/menu-categories',
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: { name: 'Mains' },
      });

      expect(response.statusCode).toBe(409);
    });

    it('PATCH /api/restaurant/menu-categories/:id — should update category details', async () => {
      const cat = await MenuCategory.findOne({ restaurantId: restaurantAId, name: 'Desserts' });
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/restaurant/menu-categories/${cat!._id.toString()}`,
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: { name: 'Sri Lankan Sweets & Desserts' },
      });

      expect(response.statusCode).toBe(200);
      const updatedCat = await MenuCategory.findById(cat!._id);
      expect(updatedCat!.name).toBe('Sri Lankan Sweets & Desserts');
    });

    it('DELETE /api/restaurant/menu-categories/:id — should reject category deletion if items reference it (400 BAD_REQUEST)', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/restaurant/menu-categories/${categoryAId.toString()}`,
        headers: { authorization: `Bearer ${ownerAToken}` },
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.payload);
      expect(payload.error.message).toContain('containing existing menu items');
    });
  });

  describe('Menu Item Owner Management & Authorization', () => {
    it('GET /api/restaurant/menu-items — should list all menu items (including unavailable items) for owner', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/restaurant/menu-items',
        headers: { authorization: `Bearer ${ownerAToken}` },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.items.length).toBeGreaterThanOrEqual(2); // Includes devilled crab & lobster curry
    });

    it('POST /api/restaurant/menu-items — should allow owner to create a valid menu item in integer cents', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/restaurant/menu-items',
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: {
          categoryId: categoryAId.toString(),
          name: 'Fish Ambul Thiyal',
          description: 'Sour spicy fish curry',
          price: 1600, // €16.00
          isVegetarian: false,
          isAvailable: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.payload);
      expect(payload.item.name).toBe('Fish Ambul Thiyal');
      expect(payload.item.price).toBe(1600);
      expect(payload.item.restaurantId).toBe(restaurantAId.toString());
    });

    it('Price Security & Validation: should reject negative prices', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/restaurant/menu-items',
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: {
          categoryId: categoryAId.toString(),
          name: 'Invalid Price Item',
          price: -500,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('PATCH /api/restaurant/menu-items/:id — should allow owner to toggle availability and update fields', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/restaurant/menu-items/${itemAId.toString()}`,
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: {
          isAvailable: false,
          price: 1950, // Price updated to €19.50
        },
      });

      expect(response.statusCode).toBe(200);
      const dbItem = await MenuItem.findById(itemAId);
      expect(dbItem!.isAvailable).toBe(false);
      expect(dbItem!.price).toBe(1950);
    });
  });

  describe('Adversarial Security & Cross-Restaurant Attack Tests', () => {
    it('Cross-Restaurant Ownership Attack: Owner A cannot modify Owner B menu category', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/restaurant/menu-categories/${categoryBId.toString()}`,
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: { name: 'Owner A Hacked Category B' },
      });

      expect(response.statusCode).toBe(404);

      // Verify Category B in MongoDB remains unchanged
      const dbCatB = await MenuCategory.findById(categoryBId);
      expect(dbCatB!.name).toBe('Specialties');
    });

    it('Cross-Restaurant Ownership Attack: Owner A cannot delete Owner B menu item', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/restaurant/menu-items/${itemBId.toString()}`,
        headers: { authorization: `Bearer ${ownerAToken}` },
      });

      expect(response.statusCode).toBe(404);

      // Verify Item B in MongoDB remains unchanged
      const dbItemB = await MenuItem.findById(itemBId);
      expect(dbItemB).not.toBeNull();
    });

    it('Cross-Restaurant Category Assignment Defense: Owner A cannot create item assigned to Owner B category', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/restaurant/menu-items',
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: {
          categoryId: categoryBId.toString(), // Belongs to Restaurant B!
          name: 'Cross Restaurant Attack Item',
          price: 1000,
        },
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.payload);
      expect(payload.error.message).toContain('does not belong to your restaurant');
    });

    it('Mass Assignment Defense: should ignore attempts to override restaurantId or _id', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/restaurant/menu-items',
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: {
          categoryId: categoryAId.toString(),
          name: 'Mass Assignment Item',
          price: 1200,
          restaurantId: restaurantBId.toString(), // Attacker tries to assign to Restaurant B
        },
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.payload);
      // Verify item was bound strictly to Owner A's restaurant
      expect(payload.item.restaurantId).toBe(restaurantAId.toString());
    });

    it('CUSTOMER RBAC Rejection: CUSTOMER accounts cannot create menu categories or items (403 FORBIDDEN)', async () => {
      const catRes = await app.inject({
        method: 'POST',
        url: '/api/restaurant/menu-categories',
        headers: { authorization: `Bearer ${customerToken}` },
        payload: { name: 'Customer Hack Category' },
      });
      expect(catRes.statusCode).toBe(403);

      const itemRes = await app.inject({
        method: 'POST',
        url: '/api/restaurant/menu-items',
        headers: { authorization: `Bearer ${customerToken}` },
        payload: { categoryId: categoryAId.toString(), name: 'Customer Hack Item', price: 100 },
      });
      expect(itemRes.statusCode).toBe(403);
    });
  });
});
