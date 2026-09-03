import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  getApplicationsQuerySchema,
  rejectApplicationSchema,
  submitApplicationSchema,
} from './application.schemas.js';
import { ApplicationService } from './application.service.js';

export async function applicationRoutes(fastify: FastifyInstance) {
  // POST /api/partner/apply (Submit prospective restaurant application)
  fastify.post(
    '/api/partner/apply',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const parseResult = submitApplicationSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid application payload',
          },
        });
      }

      const application = await ApplicationService.submitApplication(request.user.id, parseResult.data);
      return reply.status(201).send({ message: 'Application submitted successfully', application });
    }
  );

  // GET /api/partner/my-application (Get customer's latest application status)
  fastify.get(
    '/api/partner/my-application',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const application = await ApplicationService.getMyApplication(request.user.id);
      return reply.status(200).send({ application });
    }
  );

  // GET /api/admin/applications (Paginated admin application list)
  fastify.get(
    '/api/admin/applications',
    {
      preHandler: [authenticate, authorize(['SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const parseResult = getApplicationsQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid query parameters',
          },
        });
      }

      const result = await ApplicationService.getAdminApplications(parseResult.data);
      return reply.status(200).send(result);
    }
  );

  // POST /api/admin/applications/:id/approve (Super Admin approval workflow)
  fastify.post(
    '/api/admin/applications/:id/approve',
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
      const result = await ApplicationService.approveApplication(request.user.id, id);
      return reply.status(200).send(result);
    }
  );

  // POST /api/admin/applications/:id/reject (Super Admin rejection workflow)
  fastify.post(
    '/api/admin/applications/:id/reject',
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
      const parseResult = rejectApplicationSchema.safeParse(request.body || {});
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid rejection payload',
          },
        });
      }

      const result = await ApplicationService.rejectApplication(request.user.id, id, parseResult.data);
      return reply.status(200).send(result);
    }
  );
}
