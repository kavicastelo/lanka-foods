import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { favoriteStatusQuerySchema, toggleFavoriteSchema } from './favorite.schemas.js';
import { FavoriteService } from './favorite.service.js';

export async function favoriteRoutes(fastify: FastifyInstance) {
  // GET /api/favorites (Get customer's favorited restaurants and menu items)
  fastify.get(
    '/api/favorites',
    {
      preHandler: [authenticate, authorize(['CUSTOMER', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const result = await FavoriteService.getUserFavorites(request.user.id);
      return reply.status(200).send(result);
    }
  );

  // POST /api/favorites/toggle (Toggle favorite state for a target)
  fastify.post(
    '/api/favorites/toggle',
    {
      preHandler: [authenticate, authorize(['CUSTOMER', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const parseResult = toggleFavoriteSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid favorite toggle payload',
          },
        });
      }

      const result = await FavoriteService.toggleFavorite(request.user.id, parseResult.data);
      return reply.status(200).send(result);
    }
  );

  // GET /api/favorites/status (Check favorite status for target)
  fastify.get(
    '/api/favorites/status',
    {
      preHandler: [authenticate, authorize(['CUSTOMER', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const parseResult = favoriteStatusQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid status query parameters',
          },
        });
      }

      const result = await FavoriteService.getFavoriteStatus(request.user.id, parseResult.data);
      return reply.status(200).send(result);
    }
  );

  // POST /api/favorites/restaurants/:restaurantId (Add restaurant favorite)
  fastify.post(
    '/api/favorites/restaurants/:restaurantId',
    {
      preHandler: [authenticate, authorize(['CUSTOMER', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const { restaurantId } = request.params as { restaurantId: string };
      const result = await FavoriteService.addRestaurantFavorite(request.user.id, restaurantId);
      return reply.status(200).send(result);
    }
  );

  // DELETE /api/favorites/restaurants/:restaurantId (Remove restaurant favorite)
  fastify.delete(
    '/api/favorites/restaurants/:restaurantId',
    {
      preHandler: [authenticate, authorize(['CUSTOMER', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const { restaurantId } = request.params as { restaurantId: string };
      const result = await FavoriteService.removeRestaurantFavorite(request.user.id, restaurantId);
      return reply.status(200).send(result);
    }
  );

  // POST /api/favorites/menu-items/:menuItemId (Add menu item favorite)
  fastify.post(
    '/api/favorites/menu-items/:menuItemId',
    {
      preHandler: [authenticate, authorize(['CUSTOMER', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const { menuItemId } = request.params as { menuItemId: string };
      const result = await FavoriteService.addMenuItemFavorite(request.user.id, menuItemId);
      return reply.status(200).send(result);
    }
  );

  // DELETE /api/favorites/menu-items/:menuItemId (Remove menu item favorite)
  fastify.delete(
    '/api/favorites/menu-items/:menuItemId',
    {
      preHandler: [authenticate, authorize(['CUSTOMER', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const { menuItemId } = request.params as { menuItemId: string };
      const result = await FavoriteService.removeMenuItemFavorite(request.user.id, menuItemId);
      return reply.status(200).send(result);
    }
  );
}
