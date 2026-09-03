import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  getFinancialRecordsQuerySchema,
  updateCommissionConfigSchema,
} from './financial.schemas.js';
import { FinancialService } from './financial.service.js';

export async function financialRoutes(fastify: FastifyInstance) {
  // GET /api/admin/commission-config (Super Admin view global commission config)
  fastify.get(
    '/api/admin/commission-config',
    {
      preHandler: [authenticate, authorize(['SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const config = await FinancialService.getCommissionConfig();
      return reply.status(200).send({ config });
    }
  );

  // POST /api/admin/commission-config (Super Admin update global commission config)
  fastify.post(
    '/api/admin/commission-config',
    {
      preHandler: [authenticate, authorize(['SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const parseResult = updateCommissionConfigSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid commission config payload',
          },
        });
      }

      const config = await FinancialService.updateCommissionConfig(request.user.id, parseResult.data);
      return reply.status(200).send({ message: 'Commission configuration updated', config });
    }
  );

  // GET /api/admin/financial-records (Super Admin paginated financial records list)
  fastify.get(
    '/api/admin/financial-records',
    {
      preHandler: [authenticate, authorize(['SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const parseResult = getFinancialRecordsQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid query parameters',
          },
        });
      }

      const result = await FinancialService.getFinancialRecords(parseResult.data);
      return reply.status(200).send(result);
    }
  );

  // POST /api/admin/financial-records/:id/settle (Super Admin manual settlement)
  fastify.post(
    '/api/admin/financial-records/:id/settle',
    {
      preHandler: [authenticate, authorize(['SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const { id } = request.params as { id: string };
      const result = await FinancialService.settleFinancialRecord(request.user.id, id);
      return reply.status(200).send(result);
    }
  );

  // GET /api/restaurants/:restaurantId/financials (Restaurant Owner or Super Admin view)
  fastify.get(
    '/api/restaurants/:restaurantId/financials',
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
      const result = await FinancialService.getRestaurantFinancials(
        request.user.id,
        request.user.role,
        restaurantId
      );
      return reply.status(200).send(result);
    }
  );
}
