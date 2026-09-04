import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/infrastructure/database/index.js';
import { User } from '../src/models/user.model.js';
import { Restaurant } from '../src/models/restaurant.model.js';
import { Order } from '../src/models/order.model.js';
import { FinancialRecord } from '../src/models/financial-record.model.js';
import { Invoice } from '../src/models/invoice.model.js';

describe('Periodic Invoice Generation & Settlement Workflow', () => {
  let app: FastifyInstance;
  let mongoServer: MongoMemoryServer;
  let adminToken: string;
  let restaurantAdminToken: string;
  let restaurantAdminUser: any;
  let testRestaurant: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDatabase(mongoServer.getUri());
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));

    app = await buildApp();
    await app.ready();

    // 1. Create Super Admin User & Token
    const adminUser = await User.create({
      email: `admin-invoice-${Date.now()}@lankaeats.com`,
      fullName: 'Super Admin Invoices',
      role: 'SUPER_ADMIN',
      isActive: true,
    });
    adminToken = app.jwt.sign({ sub: adminUser._id.toString(), role: 'SUPER_ADMIN', email: adminUser.email });

    // 2. Create Restaurant Admin User & Token
    restaurantAdminUser = await User.create({
      email: `owner-invoice-${Date.now()}@lankaeats.com`,
      fullName: 'Restaurant Owner Invoices',
      role: 'RESTAURANT_ADMIN',
      isActive: true,
    });
    restaurantAdminToken = app.jwt.sign({ sub: restaurantAdminUser._id.toString(), role: 'RESTAURANT_ADMIN', email: restaurantAdminUser.email });

    // 3. Create Restaurant
    testRestaurant = await Restaurant.create({
      name: 'Invoice Test Cafe',
      slug: `invoice-test-cafe-${Date.now()}`,
      ownerId: restaurantAdminUser._id,
      address: '100 Galle Road',
      city: 'Colombo',
      phone: '+94770000000',
      email: 'cafe@lankaeats.com',
      cuisines: ['Sri Lankan'],
      status: 'active',
      isOpen: true,
      commissionRate: 10,
    });

    // 4. Create sample Completed Order & Financial Record
    const order = await Order.create({
      orderNumber: 'ORD-INV-001',
      restaurantId: testRestaurant._id,
      customerId: restaurantAdminUser._id,
      customerName: 'Test Customer',
      customerEmail: 'cust@lankaeats.com',
      customerPhone: '+94771111111',
      deliveryType: 'delivery',
      deliveryAddress: '123 Main St',
      items: [
        {
          menuItemId: testRestaurant._id,
          nameSnapshot: 'Rice & Curry',
          unitPrice: 1000, // €10.00
          quantity: 2,
          subtotal: 2000, // €20.00
        },
      ],
      subtotal: 2000,
      deliveryFee: 300,
      serviceFee: 99,
      total: 2399,
      status: 'completed',
      placedAt: new Date(),
    });

    await FinancialRecord.create({
      orderId: order._id,
      orderNumber: order.orderNumber,
      restaurantId: testRestaurant._id,
      customerId: restaurantAdminUser._id,
      orderSubtotal: 2000,
      deliveryFee: 300,
      serviceFee: 99,
      orderTotal: 2399,
      commissionableAmount: 2000,
      commissionRate: 10,
      commissionAmount: 200, // 10% of 2000
      platformFeeTotal: 299, // 200 + 99
      restaurantNetAmount: 2100,
      status: 'PENDING',
    });
  }, 30000);

  afterAll(async () => {
    if (testRestaurant) {
      await FinancialRecord.deleteMany({ restaurantId: testRestaurant._id });
      await Order.deleteMany({ restaurantId: testRestaurant._id });
      await Invoice.deleteMany({ restaurantId: testRestaurant._id });
      await Restaurant.deleteOne({ _id: testRestaurant._id });
    }
    await app.close();
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('POST /api/admin/invoices/generate — should generate a periodic invoice for Super Admin', async () => {
    const start = new Date(Date.now() - 86400000 * 7).toISOString();
    const end = new Date(Date.now() + 86400000).toISOString();

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/invoices/generate',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        restaurantId: testRestaurant._id.toString(),
        periodStart: start,
        periodEnd: end,
        subscriptionFee: 15.00,
        notes: 'Weekly billing summary',
      },
    });

    expect(res.statusCode).toBe(201);
    const payload = JSON.parse(res.payload);
    expect(payload.invoice).toBeDefined();
    expect(payload.invoice.invoiceNumber).toMatch(/^INV-/);
    expect(payload.invoice.orderCount).toBe(1);
    expect(payload.invoice.totalCommission).toBe(200);
    expect(payload.invoice.totalServiceFee).toBe(99);
    expect(payload.invoice.subscriptionFee).toBe(1500); // €15.00 in cents
    expect(payload.invoice.totalAmountDue).toBe(200 + 99 + 1500); // 1799 cents (€17.99)
    expect(payload.invoice.status).toBe('ISSUED');
  });

  it('GET /api/restaurant/invoices — should allow Restaurant Admin to view issued invoices', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/restaurant/invoices',
      headers: {
        authorization: `Bearer ${restaurantAdminToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.payload);
    expect(payload.data).toBeDefined();
    expect(payload.data.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/invoices/:id/payment-slip — should allow Restaurant Admin to upload payment slip', async () => {
    const invoices = await Invoice.find({ restaurantId: testRestaurant._id });
    const targetInvoice = invoices[0];

    const res = await app.inject({
      method: 'POST',
      url: `/api/invoices/${targetInvoice._id}/payment-slip`,
      headers: {
        authorization: `Bearer ${restaurantAdminToken}`,
      },
      payload: {
        paymentSlipUrl: 'https://cdn.lankaeats.com/slips/slip-001.jpg',
      },
    });

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.payload);
    expect(payload.invoice.paymentSlipUrl).toBe('https://cdn.lankaeats.com/slips/slip-001.jpg');
  });

  it('PATCH /api/admin/invoices/:id/settle — should allow Super Admin to confirm payment & settle financial records', async () => {
    const invoices = await Invoice.find({ restaurantId: testRestaurant._id });
    const targetInvoice = invoices[0];

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/admin/invoices/${targetInvoice._id}/settle`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.payload);
    expect(payload.invoice.status).toBe('PAID');
    expect(payload.invoice.paidAt).toBeDefined();

    // Verify underlying financial records are updated to SETTLED
    const records = await FinancialRecord.find({ restaurantId: testRestaurant._id });
    expect(records.every((r) => r.status === 'SETTLED')).toBe(true);
  });
});
