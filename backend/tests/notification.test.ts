import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/infrastructure/database/index.js';
import { Notification } from '../src/models/notification.model.js';
import { User } from '../src/models/user.model.js';
import { NotificationService } from '../src/modules/notifications/notification.service.js';

describe('Notification Service & API Endpoints', () => {
  let app: FastifyInstance;
  let customerToken: string;
  let customerId: string;

  beforeAll(async () => {
    await connectDatabase();
    app = await buildApp();

    // Create test customer
    const user = await User.create({
      fullName: 'Notify Test Customer',
      email: `notify.customer.${Date.now()}@example.com`,
      passwordHash: 'hashed_password_123',
      role: 'CUSTOMER',
      phone: '+358401112233',
      isActive: true,
    });

    customerId = user._id.toString();
    customerToken = app.jwt.sign({
      sub: customerId,
      role: 'CUSTOMER',
      email: user.email,
    });
  });

  afterAll(async () => {
    await app.close();
    await disconnectDatabase();
  });

  it('NotificationService.createNotification — should create notification record', async () => {
    const notification = await NotificationService.createNotification({
      userId: customerId,
      role: 'CUSTOMER',
      type: 'ORDER_STATUS',
      title: 'Order Status Update',
      message: 'Your order #ORD-999 is now PREPARING',
      link: '/order/123',
    });

    expect(notification).toBeDefined();
    expect(notification.title).toBe('Order Status Update');
    expect(notification.isRead).toBe(false);
  });

  it('GET /api/notifications — should return notifications for authenticated user', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/notifications',
      headers: {
        authorization: `Bearer ${customerToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.notifications).toBeDefined();
    expect(Array.isArray(body.notifications)).toBe(true);
    expect(body.unreadCount).toBeGreaterThanOrEqual(1);
  });

  it('PATCH /api/notifications/:id/read — should mark single notification as read', async () => {
    const notif = await Notification.findOne({ userId: customerId, isRead: false });
    expect(notif).not.toBeNull();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/notifications/${notif!._id}/read`,
      headers: {
        authorization: `Bearer ${customerToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.notification.isRead).toBe(true);
  });

  it('PATCH /api/notifications/read-all — should mark all notifications as read', async () => {
    // Create another unread notification
    await NotificationService.createNotification({
      userId: customerId,
      role: 'CUSTOMER',
      type: 'SYSTEM',
      title: 'Welcome to LankaEats',
      message: 'Explore authentic Sri Lankan dishes near you.',
    });

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/notifications/read-all',
      headers: {
        authorization: `Bearer ${customerToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.updatedCount).toBeGreaterThanOrEqual(1);
  });
});
