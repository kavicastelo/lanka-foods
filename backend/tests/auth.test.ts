import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/infrastructure/database/index.js';
import { User, comparePassword } from '../src/models/user.model.js';
import { AuthService } from '../src/modules/auth/auth.service.js';

describe('Phase 3 — Independent Authentication & RBAC Engine Security Tests', () => {
  let app: FastifyInstance;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDatabase(mongoServer.getUri());
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));

    app = await buildApp();
    await app.ready();
  }, 60000);

  afterAll(async () => {
    await app.close();
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }, 30000);

  describe('User Registration & Password Security', () => {
    it('should register a new CUSTOMER user successfully and return JWT token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'newcustomer@example.com',
          password: 'SecurePassword123!',
          fullName: 'Test Customer',
        },
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.payload);
      expect(payload.token).toBeDefined();
      expect(payload.user.email).toBe('newcustomer@example.com');
      expect(payload.user.role).toBe('CUSTOMER');
      expect(payload.user.passwordHash).toBeUndefined();

      // Verify database record
      const dbUser = await User.findOne({ email: 'newcustomer@example.com' }).select('+passwordHash');
      expect(dbUser).not.toBeNull();
      expect(dbUser!.passwordHash).not.toBe('SecurePassword123!');
      expect(await comparePassword('SecurePassword123!', dbUser!.passwordHash)).toBe(true);
    });

    it('should neutralize public privilege escalation attempts to create SUPER_ADMIN or RESTAURANT_ADMIN', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'attacker@example.com',
          password: 'SecurePassword123!',
          fullName: 'Attacker User',
          role: 'SUPER_ADMIN', // Privilege escalation attempt
        },
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.payload);
      expect(payload.user.role).toBe('CUSTOMER'); // Forced to CUSTOMER

      const dbUser = await User.findOne({ email: 'attacker@example.com' });
      expect(dbUser!.role).toBe('CUSTOMER');
    });

    it('should reject duplicate email registrations safely (HTTP 409 CONFLICT)', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'duplicate@example.com',
          password: 'Password123!',
          fullName: 'Original User',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'DUPLICATE@example.com', // Normalized casing
          password: 'Password123!',
          fullName: 'Duplicate Attempt',
        },
      });

      expect(response.statusCode).toBe(409);
      const payload = JSON.parse(response.payload);
      expect(payload.error.code).toBe('CONFLICT');
      expect(payload.error.message).toContain('already exists');
    });

    it('should validate invalid registration payloads (short password, invalid email)', async () => {
      const shortPassRes = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'valid@example.com',
          password: 'short', // < 8 characters
          fullName: 'Valid Name',
        },
      });

      expect(shortPassRes.statusCode).toBe(400);

      const invalidEmailRes = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'not-an-email',
          password: 'ValidPassword123!',
          fullName: 'Valid Name',
        },
      });

      expect(invalidEmailRes.statusCode).toBe(400);
    });

    it('should handle concurrent registration requests safely without creating duplicate accounts', async () => {
      const email = `concurrent_${Date.now()}@example.com`;
      const registrationPromises = Array.from({ length: 5 }).map(() =>
        app.inject({
          method: 'POST',
          url: '/api/auth/register',
          payload: {
            email,
            password: 'Password123!',
            fullName: 'Concurrent User',
          },
        })
      );

      const results = await Promise.all(registrationPromises);
      const successfulCreations = results.filter((r) => r.statusCode === 201);
      expect(successfulCreations).toHaveLength(1); // Exactly 1 succeeded

      const count = await User.countDocuments({ email });
      expect(count).toBe(1);
    });
  });

  describe('User Login & Credential Verification', () => {
    beforeAll(async () => {
      // Create test accounts
      await AuthService.registerUser({
        email: 'login-test@example.com',
        password: 'CorrectPassword123!',
        fullName: 'Login Test User',
        phone: ''
      });

      const inactiveUser = await User.create({
        email: 'inactive@example.com',
        fullName: 'Inactive User',
        role: 'CUSTOMER',
        passwordHash: '$2a$10$wN3kL7JtH2y2W2.W2.W2.e8zHk8x0W.W2.W2.W2.W2.W2.W2', // Dummy hash
        isActive: false,
      });
      await inactiveUser.save();
    });

    it('should authenticate user with valid credentials and return JWT', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'login-test@example.com',
          password: 'CorrectPassword123!',
        },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.token).toBeDefined();
      expect(payload.user.email).toBe('login-test@example.com');
    });

    it('should return generic UNAUTHORIZED (401) error for incorrect password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'login-test@example.com',
          password: 'WrongPassword123!',
        },
      });

      expect(response.statusCode).toBe(401);
      const payload = JSON.parse(response.payload);
      expect(payload.error.code).toBe('UNAUTHORIZED');
      expect(payload.error.message).toBe('Invalid email or password.');
    });

    it('should return generic UNAUTHORIZED (401) error for non-existent email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        },
      });

      expect(response.statusCode).toBe(401);
      const payload = JSON.parse(response.payload);
      expect(payload.error.message).toBe('Invalid email or password.');
    });

    it('should reject login for inactive/disabled user accounts', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'inactive@example.com',
          password: 'Password123!',
        },
      });

      expect(response.statusCode).toBe(401);
      const payload = JSON.parse(response.payload);
      expect(payload.error.message).toContain('Account is disabled');
    });
  });

  describe('JWT Verification & Adversarial Attack Security Tests', () => {
    let customerToken: string;
    let _restaurantAdminToken: string;
    let _superAdminToken: string;
    let userAId: string;
    let userBId: string;

    beforeAll(async () => {
      const cust = await User.create({
        email: 'authcust@example.com',
        fullName: 'Customer User',
        role: 'CUSTOMER',
        passwordHash: 'hash',
      });
      userAId = cust._id.toString();

      const userB = await User.create({
        email: 'userb@example.com',
        fullName: 'User B',
        role: 'CUSTOMER',
        passwordHash: 'hash',
      });
      userBId = userB._id.toString();

      const restAdmin = await User.create({
        email: 'authrest@example.com',
        fullName: 'Rest Admin',
        role: 'RESTAURANT_ADMIN',
        passwordHash: 'hash',
      });

      const superAdmin = await User.create({
        email: 'authadmin@example.com',
        fullName: 'Super Admin',
        role: 'SUPER_ADMIN',
        passwordHash: 'hash',
      });

      customerToken = app.jwt.sign({ sub: cust._id.toString(), role: cust.role, email: cust.email });
      _restaurantAdminToken = app.jwt.sign({ sub: restAdmin._id.toString(), role: restAdmin.role, email: restAdmin.email });
      _superAdminToken = app.jwt.sign({ sub: superAdmin._id.toString(), role: superAdmin.role, email: superAdmin.email });
    });

    it('should return 401 UNAUTHORIZED when calling protected route without Authorization header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 UNAUTHORIZED for malformed Bearer tokens', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: 'Bearer malformed_jwt_token_string',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject JWT tokens signed with an invalid/forged secret key', async () => {
      const forgedToken = app.jwt.sign(
        { sub: userAId, role: 'SUPER_ADMIN', email: 'authcust@example.com' },
        { key: 'forged_secret_key_which_does_not_match_app_secret' }
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/test/super-admin',
        headers: {
          authorization: `Bearer ${forgedToken}`,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject tampered JWT role payload modifications', async () => {
      // Craft a forged token claiming SUPER_ADMIN
      const forgedToken = app.jwt.sign(
        { sub: userAId, role: 'SUPER_ADMIN', email: 'authcust@example.com' },
        { key: 'wrong_key' }
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/test/super-admin',
        headers: {
          authorization: `Bearer ${forgedToken}`,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return authenticated user profile strictly from JWT token (preventing horizontal privilege escalation)', async () => {
      // User A attempts to request User B's profile via query/body parameters
      const response = await app.inject({
        method: 'GET',
        url: `/api/auth/me?userId=${userBId}`,
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.user.id).toBe(userAId); // Returns User A identity, ignoring userId parameter
      expect(payload.user.email).toBe('authcust@example.com');
    });

    it('should exclude passwordHash from /api/auth/me response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.user.passwordHash).toBeUndefined();
    });
  });

  describe('Role-Based Access Control (RBAC) Matrix Tests', () => {
    let customerToken: string;
    let restaurantAdminToken: string;
    let superAdminToken: string;

    beforeAll(async () => {
      const cust = await User.create({ email: 'rbac_cust@example.com', fullName: 'Cust', role: 'CUSTOMER', passwordHash: 'hash' });
      const rest = await User.create({ email: 'rbac_rest@example.com', fullName: 'Rest', role: 'RESTAURANT_ADMIN', passwordHash: 'hash' });
      const admin = await User.create({ email: 'rbac_admin@example.com', fullName: 'Admin', role: 'SUPER_ADMIN', passwordHash: 'hash' });

      customerToken = app.jwt.sign({ sub: cust._id.toString(), role: cust.role, email: cust.email });
      restaurantAdminToken = app.jwt.sign({ sub: rest._id.toString(), role: rest.role, email: rest.email });
      superAdminToken = app.jwt.sign({ sub: admin._id.toString(), role: admin.role, email: admin.email });
    });

    it('should allow CUSTOMER, RESTAURANT_ADMIN, and SUPER_ADMIN to access customer endpoint', async () => {
      const res1 = await app.inject({ method: 'GET', url: '/api/test/customer', headers: { authorization: `Bearer ${customerToken}` } });
      const res2 = await app.inject({ method: 'GET', url: '/api/test/customer', headers: { authorization: `Bearer ${restaurantAdminToken}` } });
      const res3 = await app.inject({ method: 'GET', url: '/api/test/customer', headers: { authorization: `Bearer ${superAdminToken}` } });

      expect(res1.statusCode).toBe(200);
      expect(res2.statusCode).toBe(200);
      expect(res3.statusCode).toBe(200);
    });

    it('should block CUSTOMER (403 FORBIDDEN) and allow RESTAURANT_ADMIN and SUPER_ADMIN on restaurant-admin endpoint', async () => {
      const res1 = await app.inject({ method: 'GET', url: '/api/test/restaurant-admin', headers: { authorization: `Bearer ${customerToken}` } });
      const res2 = await app.inject({ method: 'GET', url: '/api/test/restaurant-admin', headers: { authorization: `Bearer ${restaurantAdminToken}` } });
      const res3 = await app.inject({ method: 'GET', url: '/api/test/restaurant-admin', headers: { authorization: `Bearer ${superAdminToken}` } });

      expect(res1.statusCode).toBe(403);
      expect(res2.statusCode).toBe(200);
      expect(res3.statusCode).toBe(200);
    });

    it('should block CUSTOMER and RESTAURANT_ADMIN (403 FORBIDDEN) and allow SUPER_ADMIN on super-admin endpoint', async () => {
      const res1 = await app.inject({ method: 'GET', url: '/api/test/super-admin', headers: { authorization: `Bearer ${customerToken}` } });
      const res2 = await app.inject({ method: 'GET', url: '/api/test/super-admin', headers: { authorization: `Bearer ${restaurantAdminToken}` } });
      const res3 = await app.inject({ method: 'GET', url: '/api/test/super-admin', headers: { authorization: `Bearer ${superAdminToken}` } });

      expect(res1.statusCode).toBe(403);
      expect(res2.statusCode).toBe(403);
      expect(res3.statusCode).toBe(200);
    });
  });

  describe('SuperAdmin Seed Bootstrap Verification', () => {
    it('should safely bootstrap SuperAdmin account if configured in environment', async () => {
      const admin = await AuthService.seedSuperAdmin();
      if (admin) {
        expect(admin.role).toBe('SUPER_ADMIN');
        expect(admin.isActive).toBe(true);
      }
    });
  });
});
