import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  createReviewSchema,
  getCustomerReviewsQuerySchema,
  getRestaurantReviewsQuerySchema,
} from './review.schemas.js';
import { ReviewService } from './review.service.js';

export async function reviewRoutes(fastify: FastifyInstance) {
  // POST /api/reviews (Create verified review for completed order)
  fastify.post(
    '/api/reviews',
    {
      preHandler: [authenticate, authorize(['CUSTOMER', 'RESTAURANT_ADMIN', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const parseResult = createReviewSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid review payload',
          },
        });
      }

      const review = await ReviewService.createReview(request.user.id, parseResult.data);
      return reply.status(201).send({ message: 'Review created successfully', review });
    }
  );

  // GET /api/reviews/my-reviews (Customer paginated list of created reviews)
  fastify.get(
    '/api/reviews/my-reviews',
    {
      preHandler: [authenticate, authorize(['CUSTOMER', 'RESTAURANT_ADMIN', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const parseResult = getCustomerReviewsQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid query parameters',
          },
        });
      }

      const result = await ReviewService.getCustomerReviews(request.user.id, parseResult.data);
      return reply.status(200).send(result);
    }
  );

  // GET /api/restaurants/:identifier/reviews (Public paginated list of restaurant reviews)
  fastify.get('/api/restaurants/:identifier/reviews', async (request, reply) => {
    const { identifier } = request.params as { identifier: string };
    const parseResult = getRestaurantReviewsQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'BAD_REQUEST',
          message: parseResult.error.errors[0]?.message || 'Invalid query parameters',
        },
      });
    }

    const result = await ReviewService.getRestaurantReviews(identifier, parseResult.data);
    return reply.status(200).send(result);
  });

  // GET /api/admin/reviews (Super Admin all reviews)
  fastify.get(
    '/api/admin/reviews',
    {
      preHandler: [authenticate, authorize(['SUPER_ADMIN'])],
    },
    async (_request, reply) => {
      const reviews = await ReviewService.getAllReviews();
      return reply.status(200).send({ reviews });
    }
  );

  // DELETE /api/admin/reviews/:id (Super Admin moderate/delete review)
  fastify.delete(
    '/api/admin/reviews/:id',
    {
      preHandler: [authenticate, authorize(['SUPER_ADMIN'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await ReviewService.deleteReview(id);
      return reply.status(200).send({ message: 'Review deleted successfully' });
    }
  );
}
