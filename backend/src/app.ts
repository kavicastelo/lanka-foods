import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import { config } from './config/index.js';
import { loggerOptions } from './infrastructure/logger/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { registerRoutes } from './routes/index.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: loggerOptions,
    bodyLimit: 1048576, // 1 MB payload limit
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
  });

  // Security Headers Middleware
  await app.register(fastifyHelmet, {
    global: true,
    contentSecurityPolicy: config.NODE_ENV === 'production',
  });

  // CORS Middleware Configuration
  const allowedOrigins = config.CORS_ORIGINS.split(',').map((o) => o.trim().replace(/\/+$/, ''));
  await app.register(fastifyCors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return cb(null, true);
      const cleanOrigin = origin.trim().replace(/\/+$/, '');
      if (allowedOrigins.includes(cleanOrigin) || allowedOrigins.includes('*')) {
        return cb(null, true);
      }
      return cb(new Error('CORS policy does not allow access from this origin.'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // JWT Registration
  await app.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: config.JWT_EXPIRES_IN,
    },
  });

  // Rate Limiting (Configured per-route for high-risk endpoints)
  await app.register(fastifyRateLimit, {
    global: false,
  });

  // Centralized Error & 404 Handlers
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  // Register Routes
  await registerRoutes(app);

  return app;
}
