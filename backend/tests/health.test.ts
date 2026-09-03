import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

describe('Backend Foundation Infrastructure Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return 200 OK with status ok and JSON response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');

      const payload = JSON.parse(response.payload);
      expect(payload.status).toBe('ok');
      expect(payload.service).toBeDefined();
      expect(payload.version).toBeDefined();
      expect(payload.timestamp).toBeDefined();
      expect(typeof payload.uptime).toBe('number');
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 OK with status ready and initialized true', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');

      const payload = JSON.parse(response.payload);
      expect(payload.status).toBe('ready');
      expect(payload.initialized).toBe(true);
    });
  });

  describe('404 Route Not Found', () => {
    it('should return structured JSON 404 for non-existent routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/does-not-exist',
      });

      expect(response.statusCode).toBe(404);
      expect(response.headers['content-type']).toContain('application/json');

      const payload = JSON.parse(response.payload);
      expect(payload.error).toBeDefined();
      expect(payload.error.code).toBe('NOT_FOUND');
      expect(payload.error.message).toContain('Route GET /does-not-exist not found');
    });
  });

  describe('Negative & Attack Tests', () => {
    it('should handle unsupported HTTP method safely without crash', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/health',
      });

      expect(response.statusCode).toBe(404);
      const payload = JSON.parse(response.payload);
      expect(payload.error.code).toBe('NOT_FOUND');
    });

    it('should reject malformed JSON payload safely', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/health',
        headers: {
          'content-type': 'application/json',
        },
        payload: '{ malformed json: ',
      });

      expect([400, 404]).toContain(response.statusCode);
      const payload = JSON.parse(response.payload);
      expect(payload.error).toBeDefined();
    });

    it('should remain process stable and respond 200 OK to /health after negative tests', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.status).toBe('ok');
    });
  });
});
