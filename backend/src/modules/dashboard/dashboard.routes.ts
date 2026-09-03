import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { getDashboardMetricsQuerySchema } from './dashboard.schemas.js';
import { DashboardService } from './dashboard.service.js';

export async function dashboardRoutes(fastify: FastifyInstance) {
  // GET /api/dashboard/metrics (Unified route for frontend compatibility)
  fastify.get(
    '/api/dashboard/metrics',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const parseResult = getDashboardMetricsQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid dashboard query parameters',
          },
        });
      }

      const { scope, restaurantId } = parseResult.data;

      if (scope === 'admin') {
        if (request.user.role !== 'SUPER_ADMIN') {
          return reply.status(403).send({
            error: { code: 'FORBIDDEN', message: 'Super Admin access required for admin dashboard metrics' },
          });
        }
        const data = await DashboardService.getAdminDashboardMetrics();
        return reply.status(200).send({ data });
      }

      // scope === 'restaurant'
      if (!restaurantId) {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'restaurantId is required when scope is restaurant' },
        });
      }

      const data = await DashboardService.getRestaurantDashboardMetrics(
        request.user.id,
        request.user.role,
        restaurantId
      );
      return reply.status(200).send({ data });
    }
  );

  // GET /api/admin/dashboard/metrics (Dedicated RESTful route for Super Admin)
  fastify.get(
    '/api/admin/dashboard/metrics',
    {
      preHandler: [authenticate, authorize(['SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const data = await DashboardService.getAdminDashboardMetrics();
      return reply.status(200).send({ data });
    }
  );

  // GET /api/restaurants/:restaurantId/dashboard/metrics (Dedicated RESTful route for Restaurant Owners)
  fastify.get(
    '/api/restaurants/:restaurantId/dashboard/metrics',
    {
      preHandler: [authenticate, authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const { restaurantId } = request.params as { restaurantId: string };
      const data = await DashboardService.getRestaurantDashboardMetrics(
        request.user.id,
        request.user.role,
        restaurantId
      );
      return reply.status(200).send({ data });
    }
  );
}
