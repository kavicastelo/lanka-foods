import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { type Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/infrastructure/database/index.js';
import { MenuCategory, MenuItem, Order, Restaurant, Review, User } from '../src/models/index.js';

describe('Phase 8 — Customer Reviews & Rating Verification System Integration & Security Tests', () => {
  let app: FastifyInstance;
  let mongoServer: MongoMemoryServer;

  let customerAId: Types.ObjectId;
  let customerBId: Types.ObjectId;
  let ownerAId: Types.ObjectId;
  let ownerBId: Types.ObjectId;

  let customerAToken: string;
  let customerBToken: string;
  let ownerAToken: string;

  let restaurantAId: Types.ObjectId;
  let restaurantBId: Types.ObjectId;

  let itemAId: Types.ObjectId;

  let completedOrderA1Id: Types.ObjectId;
  let completedOrderA2Id: Types.ObjectId;
  let nonCompletedOrderAId: Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDatabase(mongoServer.getUri());
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));

    app = await buildApp();
    await app.ready();

    // Create Test Users
    const custA = await User.create({ email: 'revcustA@lanka.fi', fullName: 'Reviewer Customer A', role: 'CUSTOMER' });
    customerAId = custA._id;

    const custB = await User.create({ email: 'revcustB@lanka.fi', fullName: 'Reviewer Customer B', role: 'CUSTOMER' });
    customerBId = custB._id;

    const ownerA = await User.create({ email: 'revownerA@lanka.fi', fullName: 'Review Owner A', role: 'RESTAURANT_ADMIN' });
    ownerAId = ownerA._id;

    const ownerB = await User.create({ email: 'revownerB@lanka.fi', fullName: 'Review Owner B', role: 'RESTAURANT_ADMIN' });
    ownerBId = ownerB._id;

    // Issue JWT Tokens
    customerAToken = app.jwt.sign({ sub: customerAId.toString(), role: 'CUSTOMER', email: custA.email });
    customerBToken = app.jwt.sign({ sub: customerBId.toString(), role: 'CUSTOMER', email: custB.email });
    ownerAToken = app.jwt.sign({ sub: ownerAId.toString(), role: 'RESTAURANT_ADMIN', email: ownerA.email });

    // Create Test Restaurants
    const restA = await Restaurant.create({
      name: 'Kandy Royal Feast',
      slug: 'kandy-royal-feast',
      ownerId: ownerAId,
      city: 'Helsinki',
      minOrder: 1000,
      deliveryFee: 300,
      pickup: true,
      delivery: true,
      isOpen: true,
      status: 'active',
    });
    restaurantAId = restA._id;

    const restB = await Restaurant.create({
      name: 'Galle Fort Kitchen',
      slug: 'galle-fort-kitchen',
      ownerId: ownerBId,
      city: 'Espoo',
      minOrder: 1000,
      deliveryFee: 300,
      pickup: true,
      delivery: true,
      isOpen: true,
      status: 'active',
    });
    restaurantBId = restB._id;

    // Create Menu Item
    const catA = await MenuCategory.create({ restaurantId: restaurantAId, name: 'Mains', sortOrder: 1 });
    const itemA = await MenuItem.create({
      restaurantId: restaurantAId,
      categoryId: catA._id,
      name: 'Kandy Kottu Roti',
      price: 1400,
      isAvailable: true,
    });
    itemAId = itemA._id;

    // Place & Complete Order 1 for Customer A
    const order1Res = await app.inject({
      method: 'POST',
      url: '/api/orders',
      headers: { authorization: `Bearer ${customerAToken}` },
      payload: {
        restaurantId: restaurantAId.toString(),
        items: [{ menuItemId: itemAId.toString(), quantity: 1 }],
        deliveryType: 'pickup',
      },
    });
    completedOrderA1Id = new mongoose.Types.ObjectId(JSON.parse(order1Res.payload).order.id);

    // Complete Order 1 via state machine
    await app.inject({ method: 'PATCH', url: `/api/orders/${completedOrderA1Id}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'accepted' } });
    await app.inject({ method: 'PATCH', url: `/api/orders/${completedOrderA1Id}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'preparing' } });
    await app.inject({ method: 'PATCH', url: `/api/orders/${completedOrderA1Id}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'ready' } });
    await app.inject({ method: 'PATCH', url: `/api/orders/${completedOrderA1Id}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'completed' } });

    // Place & Complete Order 2 for Customer A (for rating average testing)
    const order2Res = await app.inject({
      method: 'POST',
      url: '/api/orders',
      headers: { authorization: `Bearer ${customerAToken}` },
      payload: {
        restaurantId: restaurantAId.toString(),
        items: [{ menuItemId: itemAId.toString(), quantity: 1 }],
        deliveryType: 'pickup',
      },
    });
    completedOrderA2Id = new mongoose.Types.ObjectId(JSON.parse(order2Res.payload).order.id);

    await app.inject({ method: 'PATCH', url: `/api/orders/${completedOrderA2Id}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'accepted' } });
    await app.inject({ method: 'PATCH', url: `/api/orders/${completedOrderA2Id}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'preparing' } });
    await app.inject({ method: 'PATCH', url: `/api/orders/${completedOrderA2Id}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'ready' } });
    await app.inject({ method: 'PATCH', url: `/api/orders/${completedOrderA2Id}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'completed' } });

    // Create Non-Completed Order (preparing)
    const order3Res = await app.inject({
      method: 'POST',
      url: '/api/orders',
      headers: { authorization: `Bearer ${customerAToken}` },
      payload: {
        restaurantId: restaurantAId.toString(),
        items: [{ menuItemId: itemAId.toString(), quantity: 1 }],
        deliveryType: 'pickup',
      },
    });
    nonCompletedOrderAId = new mongoose.Types.ObjectId(JSON.parse(order3Res.payload).order.id);
    await app.inject({ method: 'PATCH', url: `/api/orders/${nonCompletedOrderAId}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'accepted' } });
    await app.inject({ method: 'PATCH', url: `/api/orders/${nonCompletedOrderAId}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'preparing' } });
  }, 60000);

  afterAll(async () => {
    await app.close();
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }, 30000);

  describe('Happy Path Verified Review Creation & Rating Aggregation', () => {
    it('should create a verified review for a completed order and update restaurant aggregate rating', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/reviews',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          orderId: completedOrderA1Id.toString(),
          rating: 5,
          foodRating: 5,
          comment: 'Delicious Kottu Roti, super fresh!',
        },
      });

      expect(response.statusCode).toBe(201);
      const review = JSON.parse(response.payload).review;

      expect(review.id).toBeDefined();
      expect(review.orderId).toBe(completedOrderA1Id.toString());
      expect(review.restaurantId).toBe(restaurantAId.toString());
      expect(review.authorId).toBe(customerAId.toString());
      expect(review.authorName).toBe('Reviewer Customer A');
      expect(review.rating).toBe(5);
      expect(review.comment).toBe('Delicious Kottu Roti, super fresh!');
      expect(review.isVerified).toBe(true);

      // Verify MongoDB Document Integrity
      const dbReview = await Review.findById(review.id);
      expect(dbReview!.isVerified).toBe(true);
      expect(dbReview!.restaurantId.toString()).toBe(restaurantAId.toString());

      const dbOrder = await Order.findById(completedOrderA1Id);
      expect(dbOrder!.status).toBe('completed');

      // Verify Restaurant Rating Summary Aggregation in MongoDB
      const updatedRestA = await Restaurant.findById(restaurantAId);
      expect(updatedRestA!.ratingAverage).toBe(5);
      expect(updatedRestA!.reviewCount).toBe(1);
    });

    it('should update restaurant aggregate rating correctly after a second review', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/reviews',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          orderId: completedOrderA2Id.toString(),
          rating: 3, // Second review: 3 stars -> (5 + 3)/2 = 4.0 average
          comment: 'Good, but a bit cold.',
        },
      });

      expect(response.statusCode).toBe(201);

      const updatedRestA = await Restaurant.findById(restaurantAId);
      expect(updatedRestA!.ratingAverage).toBe(4);
      expect(updatedRestA!.reviewCount).toBe(2);
    });

    it('GET /api/restaurants/:slug/reviews — should retrieve paginated public reviews and summary stats', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/restaurants/kandy-royal-feast/reviews',
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);

      expect(payload.summary.ratingAverage).toBe(4);
      expect(payload.summary.reviewCount).toBe(2);
      expect(payload.data).toHaveLength(2);
      expect(payload.data[0].authorName).toBe('Reviewer Customer A');
      expect(payload.data[0].comment).toBeDefined();
    });

    it('GET /api/reviews/my-reviews — should retrieve reviews created by authenticated customer', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/reviews/my-reviews',
        headers: { authorization: `Bearer ${customerAToken}` },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.data.length).toBeGreaterThanOrEqual(2);
      expect(payload.data[0].authorId).toBe(customerAId.toString());
    });
  });

  describe('Adversarial Security & Review Validation Defenses', () => {
    it('IDENTITY SPOOFING ATTACK: Payload authorId/authorName must be ignored and set from JWT session', async () => {
      // Create a 3rd order for Customer A
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
      const order3Id = JSON.parse(createRes.payload).order.id;

      await app.inject({ method: 'PATCH', url: `/api/orders/${order3Id}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'accepted' } });
      await app.inject({ method: 'PATCH', url: `/api/orders/${order3Id}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'preparing' } });
      await app.inject({ method: 'PATCH', url: `/api/orders/${order3Id}/status`, headers: { authorization: `Bearer ${order3Id}/status` }, payload: { status: 'ready' } });
      await app.inject({ method: 'PATCH', url: `/api/orders/${order3Id}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'ready' } });
      await app.inject({ method: 'PATCH', url: `/api/orders/${order3Id}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'completed' } });

      const attackRes = await app.inject({
        method: 'POST',
        url: '/api/reviews',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          orderId: order3Id,
          rating: 5,
          authorId: customerBId.toString(), // Spoofed author ID
          authorName: 'Spoofed Hacker', // Spoofed name
        },
      });

      expect(attackRes.statusCode).toBe(201);
      const review = JSON.parse(attackRes.payload).review;
      expect(review.authorId).toBe(customerAId.toString()); // Must equal JWT customer
      expect(review.authorName).toBe('Reviewer Customer A'); // Must equal real user name
    });

    it('RESTAURANT SPOOFING ATTACK: Payload restaurantId must be ignored and derived strictly from order', async () => {
      // Create a 4th order for Customer A (Restaurant A)
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
      const order4Id = JSON.parse(createRes.payload).order.id;

      await app.inject({ method: 'PATCH', url: `/api/orders/${order4Id}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'accepted' } });
      await app.inject({ method: 'PATCH', url: `/api/orders/${order4Id}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'preparing' } });
      await app.inject({ method: 'PATCH', url: `/api/orders/${order4Id}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'ready' } });
      await app.inject({ method: 'PATCH', url: `/api/orders/${order4Id}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'completed' } });

      const attackRes = await app.inject({
        method: 'POST',
        url: '/api/reviews',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          orderId: order4Id,
          rating: 1,
          restaurantId: restaurantBId.toString(), // Attacker tries to attack Restaurant B!
        },
      });

      expect(attackRes.statusCode).toBe(201);
      const review = JSON.parse(attackRes.payload).review;
      expect(review.restaurantId).toBe(restaurantAId.toString()); // Must belong to Restaurant A
    });

    it('ORDER OWNERSHIP DEFENSE: Customer B cannot review Customer A completed order (403 FORBIDDEN)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/reviews',
        headers: { authorization: `Bearer ${customerBToken}` }, // Customer B attempting to review Customer A order
        payload: {
          orderId: completedOrderA1Id.toString(),
          rating: 1,
        },
      });

      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.payload).error.message).toContain('only review your own orders');
    });

    it('NON-COMPLETED ORDER DEFENSE: Cannot submit review for non-completed order (400 BAD_REQUEST)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/reviews',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          orderId: nonCompletedOrderAId.toString(), // Order is in 'preparing' status
          rating: 4,
        },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload).error.message).toContain('Only completed orders can be reviewed');
    });

    it('DUPLICATE REVIEW DEFENSE: Second review for same order must be rejected (400 BAD_REQUEST)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/reviews',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          orderId: completedOrderA1Id.toString(), // Already reviewed in first test!
          rating: 5,
        },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload).error.message).toContain('already been reviewed');
    });

    it('DATABASE CONCURRENCY DUPLICATE REVIEW DEFENSE: Concurrent reviews for same order enforced by unique index', async () => {
      // Create a 5th completed order
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
      const order5Id = JSON.parse(createRes.payload).order.id;

      await app.inject({ method: 'PATCH', url: `/api/orders/${order5Id}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'accepted' } });
      await app.inject({ method: 'PATCH', url: `/api/orders/${order5Id}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'preparing' } });
      await app.inject({ method: 'PATCH', url: `/api/orders/${order5Id}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'ready' } });
      await app.inject({ method: 'PATCH', url: `/api/orders/${order5Id}/status`, headers: { authorization: `Bearer ${ownerAToken}` }, payload: { status: 'completed' } });

      // Trigger simultaneous requests
      const [res1, res2] = await Promise.all([
        app.inject({
          method: 'POST',
          url: '/api/reviews',
          headers: { authorization: `Bearer ${customerAToken}` },
          payload: { orderId: order5Id, rating: 5 },
        }),
        app.inject({
          method: 'POST',
          url: '/api/reviews',
          headers: { authorization: `Bearer ${customerAToken}` },
          payload: { orderId: order5Id, rating: 4 },
        }),
      ]);

      const statusCodes = [res1.statusCode, res2.statusCode];
      expect(statusCodes).toContain(201);
      expect(statusCodes).toContain(400);

      // Verify exactly 1 review exists in database
      const dbReviews = await Review.find({ orderId: order5Id });
      expect(dbReviews).toHaveLength(1);
    });

    it('RATING VALIDATION DEFENSES: Rating values outside 1-5 or non-integers must be rejected (400 BAD_REQUEST)', async () => {
      const zeroRes = await app.inject({
        method: 'POST',
        url: '/api/reviews',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: { orderId: completedOrderA1Id.toString(), rating: 0 },
      });
      expect(zeroRes.statusCode).toBe(400);

      const sixRes = await app.inject({
        method: 'POST',
        url: '/api/reviews',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: { orderId: completedOrderA1Id.toString(), rating: 6 },
      });
      expect(sixRes.statusCode).toBe(400);

      const floatRes = await app.inject({
        method: 'POST',
        url: '/api/reviews',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: { orderId: completedOrderA1Id.toString(), rating: 4.5 },
      });
      expect(floatRes.statusCode).toBe(400);
    });

    it('COMMENT LENGTH LIMIT: Comments exceeding 1000 characters must be rejected (400 BAD_REQUEST)', async () => {
      const longComment = 'A'.repeat(1001);
      const response = await app.inject({
        method: 'POST',
        url: '/api/reviews',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: { orderId: completedOrderA1Id.toString(), rating: 5, comment: longComment },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
