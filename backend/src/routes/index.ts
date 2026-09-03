import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { applicationRoutes } from '../modules/applications/application.routes.js';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { categoryRoutes } from '../modules/categories/category.routes.js';
import { dashboardRoutes } from '../modules/dashboard/dashboard.routes.js';
import { favoriteRoutes } from '../modules/favorites/favorite.routes.js';
import { financialRoutes } from '../modules/financials/financial.routes.js';
import { mediaRoutes } from '../modules/media/media.routes.js';
import { menuRoutes } from '../modules/menu/menu.routes.js';
import { orderRoutes } from '../modules/orders/order.routes.js';
import { restaurantRoutes } from '../modules/restaurants/restaurant.routes.js';
import { reviewRoutes } from '../modules/reviews/review.routes.js';
import { healthRoutes } from './health.routes.js';

export async function registerRoutes(fastify: FastifyInstance) {
  // Register core health routes
  await fastify.register(healthRoutes);

  // Register authentication routes
  await fastify.register(authRoutes);

  // Register domain, analytics & media storage services
  await fastify.register(restaurantRoutes);
  await fastify.register(categoryRoutes);
  await fastify.register(menuRoutes);
  await fastify.register(orderRoutes);
  await fastify.register(reviewRoutes);
  await fastify.register(favoriteRoutes);
  await fastify.register(applicationRoutes);
  await fastify.register(financialRoutes);
  await fastify.register(dashboardRoutes);
  await fastify.register(mediaRoutes);

  // Minimal RBAC Verification Routes (for testing authorization boundaries)
  fastify.get('/api/test/customer', {
    preHandler: [authenticate, authorize(['CUSTOMER', 'RESTAURANT_ADMIN', 'SUPER_ADMIN'])],
  }, async (request, reply) => {
    return reply.status(200).send({ message: 'Customer endpoint accessible', user: request.user });
  });

  fastify.get('/api/test/restaurant-admin', {
    preHandler: [authenticate, authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])],
  }, async (request, reply) => {
    return reply.status(200).send({ message: 'Restaurant Admin endpoint accessible', user: request.user });
  });

  fastify.get('/api/test/super-admin', {
    preHandler: [authenticate, authorize(['SUPER_ADMIN'])],
  }, async (request, reply) => {
    return reply.status(200).send({ message: 'Super Admin endpoint accessible', user: request.user });
  });
}
