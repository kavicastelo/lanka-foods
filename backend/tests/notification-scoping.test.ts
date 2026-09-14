import mongoose, { type Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/infrastructure/database/index.js';
import { Restaurant, User, Notification } from '../src/models/index.js';
import { NotificationService } from '../src/modules/notifications/notification.service.js';

describe('Restaurant-Specific Notification Scoping & Isolation Tests', () => {
  let app: FastifyInstance;

  let ownerAId: Types.ObjectId;
  let ownerBId: Types.ObjectId;
  let customerId: Types.ObjectId;

  let ownerAToken: string;
  let ownerBToken: string;
  let customerToken: string;

  let restaurantAId: Types.ObjectId;
  let restaurantBId: Types.ObjectId;

  const runId = Date.now();

  beforeAll(async () => {
    await connectDatabase();
    app = await buildApp();
    await app.ready();

    // Create Owners and Customer
    const ownerA = await User.create({
      email: `ownerA.${runId}@notif.test`,
      fullName: 'Owner Restaurant A',
      role: 'RESTAURANT_ADMIN',
      passwordHash: 'hash_123',
    });
    ownerAId = ownerA._id;

    const ownerB = await User.create({
      email: `ownerB.${runId}@notif.test`,
      fullName: 'Owner Restaurant B',
      role: 'RESTAURANT_ADMIN',
      passwordHash: 'hash_123',
    });
    ownerBId = ownerB._id;

    const customer = await User.create({
      email: `customer.${runId}@notif.test`,
      fullName: 'Customer One',
      role: 'CUSTOMER',
      passwordHash: 'hash_123',
    });
    customerId = customer._id;

    // Issue JWTs
    ownerAToken = app.jwt.sign({ sub: ownerAId.toString(), role: 'RESTAURANT_ADMIN', email: ownerA.email });
    ownerBToken = app.jwt.sign({ sub: ownerBId.toString(), role: 'RESTAURANT_ADMIN', email: ownerB.email });
    customerToken = app.jwt.sign({ sub: customerId.toString(), role: 'CUSTOMER', email: customer.email });

    // Create Restaurants
    const restA = await Restaurant.create({
      name: `Restaurant Alpha ${runId}`,
      slug: `restaurant-alpha-${runId}`,
      ownerId: ownerAId,
      city: 'Helsinki',
      address: 'Mannerheimintie 1',
      phone: '+358401111111',
      email: `alpha.${runId}@food.fi`,
      status: 'active',
      minOrder: 1000,
      deliveryFee: 350,
      hours: '11:00 - 21:00',
    });
    restaurantAId = restA._id;

    const restB = await Restaurant.create({
      name: `Restaurant Beta ${runId}`,
      slug: `restaurant-beta-${runId}`,
      ownerId: ownerBId,
      city: 'Espoo',
      address: 'Otakaari 1',
      phone: '+358402222222',
      email: `beta.${runId}@food.fi`,
      status: 'active',
      minOrder: 1500,
      deliveryFee: 400,
      hours: '12:00 - 22:00',
    });
    restaurantBId = restB._id;
  });

  afterAll(async () => {
    // Cleanup created test records
    await Notification.deleteMany({
      $or: [
        { restaurantId: { $in: [restaurantAId, restaurantBId] } },
        { userId: { $in: [ownerAId, ownerBId, customerId] } },
      ],
    });
    await Restaurant.deleteMany({ _id: { $in: [restaurantAId, restaurantBId] } });
    await User.deleteMany({ _id: { $in: [ownerAId, ownerBId, customerId] } });

    if (app) await app.close();
    await disconnectDatabase();
  });

  it('should isolate restaurant order notifications strictly to the respective restaurant admin', async () => {
    // Dispatch notification for Restaurant A
    const notifA = await NotificationService.createNotification({
      restaurantId: restaurantAId,
      role: 'RESTAURANT_ADMIN',
      type: 'NEW_ORDER',
      title: 'New Order for Alpha #101',
      message: 'You have received an order for Alpha',
      link: '/restaurant/dashboard?tab=orders',
    });

    // Dispatch notification for Restaurant B
    const notifB = await NotificationService.createNotification({
      restaurantId: restaurantBId,
      role: 'RESTAURANT_ADMIN',
      type: 'NEW_ORDER',
      title: 'New Order for Beta #202',
      message: 'You have received an order for Beta',
      link: '/restaurant/dashboard?tab=orders',
    });

    // 1. Fetch notifications as Owner A
    const resA = await app.inject({
      method: 'GET',
      url: '/api/notifications',
      headers: { authorization: `Bearer ${ownerAToken}` },
    });
    expect(resA.statusCode).toBe(200);
    const bodyA = JSON.parse(resA.payload);
    const notifAIds = bodyA.notifications.map((n: any) => n._id);

    expect(notifAIds).toContain(notifA._id.toString());
    expect(notifAIds).not.toContain(notifB._id.toString());

    // 2. Fetch notifications as Owner B
    const resB = await app.inject({
      method: 'GET',
      url: '/api/notifications',
      headers: { authorization: `Bearer ${ownerBToken}` },
    });
    expect(resB.statusCode).toBe(200);
    const bodyB = JSON.parse(resB.payload);
    const notifBIds = bodyB.notifications.map((n: any) => n._id);

    expect(notifBIds).toContain(notifB._id.toString());
    expect(notifBIds).not.toContain(notifA._id.toString());

    // 3. Customer should not see any restaurant admin notifications
    const resCust = await app.inject({
      method: 'GET',
      url: '/api/notifications',
      headers: { authorization: `Bearer ${customerToken}` },
    });
    expect(resCust.statusCode).toBe(200);
    const bodyCust = JSON.parse(resCust.payload);
    const custNotifIds = bodyCust.notifications.map((n: any) => n._id);
    expect(custNotifIds).not.toContain(notifA._id.toString());
    expect(custNotifIds).not.toContain(notifB._id.toString());
  });

  it('should only mark notifications as read for the respective restaurant admin', async () => {
    // Create unread notifications for Restaurant A and Restaurant B
    const alpha1 = await NotificationService.createNotification({
      restaurantId: restaurantAId,
      role: 'RESTAURANT_ADMIN',
      type: 'NEW_ORDER',
      title: `Alpha Order 1 ${runId}`,
      message: 'Alpha unread 1',
    });
    const alpha2 = await NotificationService.createNotification({
      restaurantId: restaurantAId,
      role: 'RESTAURANT_ADMIN',
      type: 'NEW_ORDER',
      title: `Alpha Order 2 ${runId}`,
      message: 'Alpha unread 2',
    });

    const beta1 = await NotificationService.createNotification({
      restaurantId: restaurantBId,
      role: 'RESTAURANT_ADMIN',
      type: 'NEW_ORDER',
      title: `Beta Order 1 ${runId}`,
      message: 'Beta unread 1',
    });
    const beta2 = await NotificationService.createNotification({
      restaurantId: restaurantBId,
      role: 'RESTAURANT_ADMIN',
      type: 'NEW_ORDER',
      title: `Beta Order 2 ${runId}`,
      message: 'Beta unread 2',
    });

    // Owner A marks all as read
    const markRes = await app.inject({
      method: 'PATCH',
      url: '/api/notifications/read-all',
      headers: { authorization: `Bearer ${ownerAToken}` },
    });
    expect(markRes.statusCode).toBe(200);

    // Verify Alpha notifications are marked read
    const refreshedAlpha1 = await Notification.findById(alpha1._id);
    const refreshedAlpha2 = await Notification.findById(alpha2._id);
    expect(refreshedAlpha1?.isRead).toBe(true);
    expect(refreshedAlpha2?.isRead).toBe(true);

    // Verify Beta notifications are STILL unread!
    const refreshedBeta1 = await Notification.findById(beta1._id);
    const refreshedBeta2 = await Notification.findById(beta2._id);
    expect(refreshedBeta1?.isRead).toBe(false);
    expect(refreshedBeta2?.isRead).toBe(false);
  });
});
