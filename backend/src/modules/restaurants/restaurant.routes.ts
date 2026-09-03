import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { restaurantQuerySchema, updateRestaurantSettingsSchema } from './restaurant.schemas.js';
import { RestaurantService } from './restaurant.service.js';

export async function restaurantRoutes(fastify: FastifyInstance) {
  // GET /api/restaurants (Public restaurant discovery & pagination)
  fastify.get('/api/restaurants', async (request, reply) => {
    const parseResult = restaurantQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'BAD_REQUEST',
          message: parseResult.error.errors[0]?.message || 'Invalid query parameters',
        },
      });
    }

    const result = await RestaurantService.listPublicRestaurants(parseResult.data);
    return reply.status(200).send(result);
  });

  // GET /api/restaurant/me (Authenticated Owner profile endpoint)
  fastify.get(
    '/api/restaurant/me',
    {
      preHandler: [authenticate, authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const restaurant = await RestaurantService.getOwnerRestaurant(request.user.id);
      return reply.status(200).send({ restaurant });
    }
  );

  // PATCH /api/restaurant/settings (Authenticated Owner settings update)
  fastify.patch(
    '/api/restaurant/settings',
    {
      preHandler: [authenticate, authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const parseResult = updateRestaurantSettingsSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid settings payload',
          },
        });
      }

      const restaurant = await RestaurantService.updateOwnerSettings(request.user.id, parseResult.data);
      return reply.status(200).send({ message: 'Settings updated successfully', restaurant });
    }
  );

  // GET /api/restaurants/:slug (Public storefront detail by slug)
  fastify.get('/api/restaurants/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    if (!slug || typeof slug !== 'string') {
      return reply.status(400).send({
        error: { code: 'BAD_REQUEST', message: 'Slug parameter is required' },
      });
    }

    const restaurant = await RestaurantService.getPublicRestaurantBySlug(slug);
    return reply.status(200).send({ restaurant });
  });
}
