import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/infrastructure/database/index.js';
import { ContactSubmission } from '../src/models/contact.model.js';

describe('Contact Form & Zoho Mail Integration Endpoint', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await connectDatabase();
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
    await disconnectDatabase();
  });

  it('POST /api/contact — should reject invalid payloads with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/contact',
      payload: {
        name: 'A', // too short
        email: 'invalid-email',
        message: 'hi', // too short
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBe('Validation failed');
    expect(body.details.email).toBeDefined();
  });

  it('POST /api/contact — should accept valid payload, persist submission to MongoDB, and return 201', async () => {
    const payload = {
      name: 'Nuwan Perera',
      email: 'nuwan.perera@example.fi',
      category: 'General Inquiry',
      subject: 'Order Question',
      message: 'Hello, I would like to inquire about Sri Lankan catering services in Helsinki.',
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/contact',
      payload,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('Your message has been sent successfully!');
    expect(body.submission.email).toBe('nuwan.perera@example.fi');

    // Verify database record
    const dbRecord = await ContactSubmission.findOne({ email: 'nuwan.perera@example.fi' });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.name).toBe('Nuwan Perera');
    expect(dbRecord?.category).toBe('General Inquiry');
  });
});
