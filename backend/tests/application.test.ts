import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { type Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/infrastructure/database/index.js';
import { Restaurant, RestaurantApplication, User } from '../src/models/index.js';

describe('Phase 10 — Restaurant Application Workflow Integration & Security Tests', () => {
  let app: FastifyInstance;
  let mongoServer: MongoMemoryServer;

  let customerAId: Types.ObjectId;
  let customerBId: Types.ObjectId;
  let superAdminId: Types.ObjectId;

  let customerAToken: string;
  let customerBToken: string;
  let superAdminToken: string;

  let applicationBId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDatabase(mongoServer.getUri());
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));

    app = await buildApp();
    await app.ready();

    // Create Test Users
    const custA = await User.create({ email: 'appcustA@lanka.fi', fullName: 'Applicant Customer A', role: 'CUSTOMER' });
    customerAId = custA._id;

    const custB = await User.create({ email: 'appcustB@lanka.fi', fullName: 'Applicant Customer B', role: 'CUSTOMER' });
    customerBId = custB._id;

    const admin = await User.create({ email: 'appadmin@lanka.fi', fullName: 'Application Admin', role: 'SUPER_ADMIN' });
    superAdminId = admin._id;

    // Issue JWT Tokens
    customerAToken = app.jwt.sign({ sub: customerAId.toString(), role: 'CUSTOMER', email: custA.email });
    customerBToken = app.jwt.sign({ sub: customerBId.toString(), role: 'CUSTOMER', email: custB.email });
    superAdminToken = app.jwt.sign({ sub: superAdminId.toString(), role: 'SUPER_ADMIN', email: admin.email });
  }, 60000);

  afterAll(async () => {
    await app.close();
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }, 30000);

  describe('Happy Path Restaurant Application & Approval Workflow', () => {
    let applicationAId: string;

    it('POST /api/partner/apply — should submit application in pending status', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/partner/apply',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          businessName: 'Lankan Spice Haven',
          ownerName: 'Applicant Customer A',
          email: 'appcustA@lanka.fi',
          phone: '+358409998877',
          city: 'Helsinki',
          address: 'Mannerheimintie 10',
          businessType: 'Restaurant',
          cuisine: 'Sri Lankan',
          description: 'Authentic Sri Lankan Lamprais & Kottu',
          pickup: true,
          delivery: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const application = JSON.parse(response.payload).application;
      expect(application.id).toBeDefined();
      expect(application.applicantUserId).toBe(customerAId.toString());
      expect(application.status).toBe('pending');
      expect(application.businessName).toBe('Lankan Spice Haven');

      applicationAId = application.id;

      // Verify MongoDB Document
      const dbApp = await RestaurantApplication.findById(applicationAId);
      expect(dbApp!.status).toBe('pending');
    });

    it('GET /api/partner/my-application — customer should retrieve own application status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/partner/my-application',
        headers: { authorization: `Bearer ${customerAToken}` },
      });

      expect(response.statusCode).toBe(200);
      const application = JSON.parse(response.payload).application;
      expect(application.id).toBe(applicationAId);
      expect(application.businessName).toBe('Lankan Spice Haven');
    });

    it('GET /api/admin/applications — Super Admin lists paginated applications', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/applications?status=pending',
        headers: { authorization: `Bearer ${superAdminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.data.length).toBeGreaterThanOrEqual(1);
      expect(payload.data[0].id).toBe(applicationAId);
    });

    it('POST /api/admin/applications/:id/approve — Super Admin approves application, creates active Restaurant, promotes user to RESTAURANT_ADMIN', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/admin/applications/${applicationAId}/approve`,
        headers: { authorization: `Bearer ${superAdminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.application.status).toBe('approved');
      expect(payload.restaurant.name).toBe('Lankan Spice Haven');
      expect(payload.restaurant.ownerId).toBe(customerAId.toString());
      expect(payload.restaurant.status).toBe('active');

      // Verify Restaurant created in MongoDB
      const dbRest = await Restaurant.findOne({ ownerId: customerAId });
      expect(dbRest).not.toBeNull();
      expect(dbRest!.name).toBe('Lankan Spice Haven');
      expect(dbRest!.status).toBe('active');

      // Verify User Role Promotion in MongoDB
      const dbUser = await User.findById(customerAId);
      expect(dbUser!.role).toBe('RESTAURANT_ADMIN');
    });

    it('APPROVAL IDEMPOTENCY: Retrying approval on an already approved application returns 200 without duplicate restaurant creation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/admin/applications/${applicationAId}/approve`,
        headers: { authorization: `Bearer ${superAdminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const restaurants = await Restaurant.find({ ownerId: customerAId });
      expect(restaurants).toHaveLength(1); // Exactly 1 restaurant exists
    });
  });

  describe('Happy Path Rejection Workflow', () => {
    it('POST /api/admin/applications/:id/reject — Super Admin rejects application with reason', async () => {
      // Customer B submits application
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/partner/apply',
        headers: { authorization: `Bearer ${customerBToken}` },
        payload: {
          businessName: 'Unverified Kitchen',
          ownerName: 'Applicant Customer B',
          email: 'appcustB@lanka.fi',
          city: 'Espoo',
        },
      });
      applicationBId = JSON.parse(createRes.payload).application.id;

      // Super Admin rejects
      const response = await app.inject({
        method: 'POST',
        url: `/api/admin/applications/${applicationBId}/reject`,
        headers: { authorization: `Bearer ${superAdminToken}` },
        payload: { reason: 'Incomplete business registration documents.' },
      });

      expect(response.statusCode).toBe(200);
      const application = JSON.parse(response.payload).application;
      expect(application.status).toBe('rejected');
      expect(application.rejectionReason).toBe('Incomplete business registration documents.');

      // Verify MongoDB Document
      const dbApp = await RestaurantApplication.findById(applicationBId);
      expect(dbApp!.status).toBe('rejected');

      // Verify Customer B role remains CUSTOMER
      const dbUser = await User.findById(customerBId);
      expect(dbUser!.role).toBe('CUSTOMER');
    });

    it('INVALID TRANSITION: Approving a rejected application must be rejected (400 BAD_REQUEST)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/admin/applications/${applicationBId}/approve`,
        headers: { authorization: `Bearer ${superAdminToken}` },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload).error.message).toContain('Cannot approve a rejected application');
    });
  });

  describe('Adversarial Security & Privilege Escalation Defenses', () => {
    it('UNAUTHENTICATED DEFENSE: Unauthenticated requests must be rejected (401 UNAUTHORIZED)', async () => {
      const applyRes = await app.inject({ method: 'POST', url: '/api/partner/apply', payload: { businessName: 'Hacker Eats' } });
      expect(applyRes.statusCode).toBe(401);

      const listRes = await app.inject({ method: 'GET', url: '/api/admin/applications' });
      expect(listRes.statusCode).toBe(401);
    });

    it('PRIVILEGE ESCALATION DEFENSE: CUSTOMER cannot access admin application endpoints (403 FORBIDDEN)', async () => {
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/admin/applications',
        headers: { authorization: `Bearer ${customerAToken}` },
      });
      expect(listRes.statusCode).toBe(403);

      const approveRes = await app.inject({
        method: 'POST',
        url: `/api/admin/applications/${applicationBId}/approve`,
        headers: { authorization: `Bearer ${customerAToken}` },
      });
      expect(approveRes.statusCode).toBe(403);
    });

    it('STATUS TAMPERING DEFENSE: Client payload sending status: "approved" must be overridden with "pending"', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/partner/apply',
        headers: { authorization: `Bearer ${customerBToken}` }, // Customer B resubmits
        payload: {
          businessName: 'Sneaky Kitchen',
          ownerName: 'Applicant Customer B',
          email: 'appcustB@lanka.fi',
          status: 'approved', // Attacker tries to self-approve!
        },
      });

      expect(response.statusCode).toBe(201);
      const application = JSON.parse(response.payload).application;
      expect(application.status).toBe('pending'); // Must default to pending!
    });

    it('DUPLICATE PENDING APPLICATION DEFENSE: Second application submission while one is pending must be rejected (400 BAD_REQUEST)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/partner/apply',
        headers: { authorization: `Bearer ${customerBToken}` }, // Already has pending application 'Sneaky Kitchen'
        payload: {
          businessName: 'Another Kitchen Attempt',
          ownerName: 'Applicant Customer B',
          email: 'appcustB@lanka.fi',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload).error.message).toContain('already have a pending restaurant application');
    });
  });
});
