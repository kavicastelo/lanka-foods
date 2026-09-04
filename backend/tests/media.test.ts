import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { type Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/infrastructure/database/index.js';
import { R2StorageService } from '../src/infrastructure/storage/r2-client.js';
import { Restaurant, User } from '../src/models/index.js';

describe('Phase 13 — Media Storage & Cloudflare R2 Integration Tests', () => {
  let app: FastifyInstance;
  let mongoServer: MongoMemoryServer;

  let customerId: Types.ObjectId;
  let restAdminAId: Types.ObjectId;
  let restAdminBId: Types.ObjectId;

  let restaurantAId: Types.ObjectId;
  let restaurantBId: Types.ObjectId;

  let customerToken: string;
  let restAdminAToken: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDatabase(mongoServer.getUri());
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));

    app = await buildApp();
    await app.ready();

    // Create Test Users
    const cust = await User.create({ email: 'mediaCust@lanka.fi', fullName: 'Media Customer', role: 'CUSTOMER' });
    customerId = cust._id;

    const adminA = await User.create({ email: 'mediaAdminA@lanka.fi', fullName: 'Media Restaurant Admin A', role: 'RESTAURANT_ADMIN' });
    restAdminAId = adminA._id;

    const adminB = await User.create({ email: 'mediaAdminB@lanka.fi', fullName: 'Media Restaurant Admin B', role: 'RESTAURANT_ADMIN' });
    restAdminBId = adminB._id;

    // Create Restaurants
    const restA = await Restaurant.create({
      name: 'Media Test Restaurant A',
      slug: 'media-test-restaurant-a',
      ownerId: restAdminAId,
      city: 'Helsinki',
      address: 'Media Way 1',
      status: 'active',
    });
    restaurantAId = restA._id;

    const restB = await Restaurant.create({
      name: 'Media Test Restaurant B',
      slug: 'media-test-restaurant-b',
      ownerId: restAdminBId,
      city: 'Espoo',
      address: 'Media Way 2',
      status: 'active',
    });
    restaurantBId = restB._id;

    // Issue Tokens
    customerToken = app.jwt.sign({ sub: customerId.toString(), role: 'CUSTOMER', email: cust.email });
    restAdminAToken = app.jwt.sign({ sub: restAdminAId.toString(), role: 'RESTAURANT_ADMIN', email: adminA.email });
  }, 60000);

  afterAll(async () => {
    await app.close();
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }, 30000);

  describe('Storage Adapter & Public URL Strategy', () => {
    it('R2StorageService.getPublicUrl — returns clean public CDN URL', () => {
      const publicUrl = R2StorageService.getPublicUrl('restaurants/123/cover/banner.png');
      expect(publicUrl).toContain('restaurants/123/cover/banner.png');
    });

    it('R2StorageService.generateUploadUrl — generates valid storage upload result', async () => {
      const result = await R2StorageService.generateUploadUrl('restaurants/123/cover/banner.png', 'image/png');
      expect(result.uploadUrl).toBeDefined();
      expect(result.publicUrl).toContain('restaurants/123/cover/banner.png');
      expect(result.objectKey).toBe('restaurants/123/cover/banner.png');
      expect(result.expiresInSeconds).toBe(900);
    });
  });

  describe('Presigned Upload URL Generation Workflow', () => {
    it('POST /api/media/upload-url — Restaurant Admin A requests upload URL for cover image', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/media/upload-url',
        headers: { authorization: `Bearer ${restAdminAToken}` },
        payload: {
          category: 'restaurant_cover',
          fileName: 'cover_hero.png',
          fileType: 'image/png',
          fileSize: 2048000,
          restaurantId: restaurantAId.toString(),
        },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.uploadUrl).toBeDefined();
      expect(payload.publicUrl).toContain(`restaurants/${restaurantAId}/cover/`);
      expect(payload.objectKey).toMatch(new RegExp(`^restaurants/${restaurantAId}/cover/[a-f0-9-]+\\.png$`));
      expect(payload.expiresInSeconds).toBe(900);
    });

    it('POST /api/media/upload-url — Customer requests application logo upload URL', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/media/upload-url',
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          category: 'application_logo',
          fileName: 'shop_logo.jpg',
          fileType: 'image/jpeg',
          fileSize: 500000,
        },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.objectKey).toMatch(new RegExp(`^applications/${customerId}/[a-f0-9-]+\\.jpg$`));
    });

    it('POST /api/media/upload — should accept base64 image payload and return publicUrl', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/media/upload',
        headers: { authorization: `Bearer ${restAdminAToken}` },
        payload: {
          category: 'menu_item',
          fileName: 'kottu.png',
          fileType: 'image/png',
          fileSize: 1024,
          restaurantId: restaurantAId.toString(),
          base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.publicUrl).toBeDefined();
      expect(payload.objectKey).toMatch(new RegExp(`^menu-items/${restaurantAId}/[a-f0-9-]+\\.png$`));
    });

    it('DELETE /api/media — Restaurant Admin A deletes media object', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/media',
        headers: { authorization: `Bearer ${restAdminAToken}` },
        payload: {
          objectKey: `restaurants/${restaurantAId}/cover/banner.png`,
          restaurantId: restaurantAId.toString(),
        },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload).message).toContain('deleted successfully');
    });
  });

  describe('Validation & Security Defenses', () => {
    it('PATH TRAVERSAL DEFENSE: Filenames containing path traversal characters must be rejected (400 BAD_REQUEST)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/media/upload-url',
        headers: { authorization: `Bearer ${restAdminAToken}` },
        payload: {
          category: 'restaurant_cover',
          fileName: '../../etc/passwd',
          fileType: 'image/png',
          fileSize: 1000,
          restaurantId: restaurantAId.toString(),
        },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload).error.message).toContain('path traversal');
    });

    it('MIME TYPE DEFENSE: Unsupported file types (e.g. application/pdf) must be rejected (400 BAD_REQUEST)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/media/upload-url',
        headers: { authorization: `Bearer ${restAdminAToken}` },
        payload: {
          category: 'restaurant_cover',
          fileName: 'document.pdf',
          fileType: 'application/pdf',
          fileSize: 1000,
          restaurantId: restaurantAId.toString(),
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('FILE SIZE DEFENSE: Files exceeding 5MB max limit must be rejected (400 BAD_REQUEST)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/media/upload-url',
        headers: { authorization: `Bearer ${restAdminAToken}` },
        payload: {
          category: 'restaurant_cover',
          fileName: 'huge_image.jpg',
          fileType: 'image/jpeg',
          fileSize: 10 * 1024 * 1024, // 10MB
          restaurantId: restaurantAId.toString(),
        },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload).error.message).toContain('exceeds maximum limit');
    });

    it('CROSS-RESTAURANT DEFENSE: Restaurant Admin A requesting upload URL for Restaurant B must be rejected (403 FORBIDDEN)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/media/upload-url',
        headers: { authorization: `Bearer ${restAdminAToken}` },
        payload: {
          category: 'restaurant_cover',
          fileName: 'attack.png',
          fileType: 'image/png',
          fileSize: 1000,
          restaurantId: restaurantBId.toString(),
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('UNAUTHENTICATED DEFENSE: Unauthenticated media upload requests must be rejected (401 UNAUTHORIZED)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/media/upload-url',
        payload: {
          category: 'restaurant_cover',
          fileName: 'unauth.png',
          fileType: 'image/png',
          fileSize: 1000,
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
