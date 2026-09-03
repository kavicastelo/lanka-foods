import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  createMenuCategorySchema,
  createMenuItemSchema,
  updateMenuCategorySchema,
  updateMenuItemSchema,
} from './menu.schemas.js';
import { MenuService } from './menu.service.js';

export async function menuRoutes(fastify: FastifyInstance) {
  // GET /api/restaurants/:slug/menu (Public catalog for active restaurant)
  fastify.get('/api/restaurants/:slug/menu', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    if (!slug || typeof slug !== 'string') {
      return reply.status(400).send({
        error: { code: 'BAD_REQUEST', message: 'Slug parameter is required' },
      });
    }

    const catalog = await MenuService.getPublicMenuByRestaurantSlug(slug);
    return reply.status(200).send(catalog);
  });

  // --- MENU CATEGORY OWNER ENDPOINTS ---

  // GET /api/restaurant/menu-categories
  fastify.get(
    '/api/restaurant/menu-categories',
    {
      preHandler: [authenticate, authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const categories = await MenuService.getOwnerMenuCategories(request.user.id);
      return reply.status(200).send({ categories });
    }
  );

  // POST /api/restaurant/menu-categories
  fastify.post(
    '/api/restaurant/menu-categories',
    {
      preHandler: [authenticate, authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const parseResult = createMenuCategorySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid category payload',
          },
        });
      }

      const category = await MenuService.createMenuCategory(request.user.id, parseResult.data);
      return reply.status(201).send({ message: 'Category created successfully', category });
    }
  );

  // PATCH /api/restaurant/menu-categories/:id
  fastify.patch(
    '/api/restaurant/menu-categories/:id',
    {
      preHandler: [authenticate, authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const { id } = request.params as { id: string };
      const parseResult = updateMenuCategorySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid category update payload',
          },
        });
      }

      const category = await MenuService.updateMenuCategory(request.user.id, id, parseResult.data);
      return reply.status(200).send({ message: 'Category updated successfully', category });
    }
  );

  // DELETE /api/restaurant/menu-categories/:id
  fastify.delete(
    '/api/restaurant/menu-categories/:id',
    {
      preHandler: [authenticate, authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const { id } = request.params as { id: string };
      await MenuService.deleteMenuCategory(request.user.id, id);
      return reply.status(200).send({ message: 'Category deleted successfully' });
    }
  );

  // --- MENU ITEM OWNER ENDPOINTS ---

  // GET /api/restaurant/menu-items
  fastify.get(
    '/api/restaurant/menu-items',
    {
      preHandler: [authenticate, authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const items = await MenuService.getOwnerMenuItems(request.user.id);
      return reply.status(200).send({ items });
    }
  );

  // POST /api/restaurant/menu-items
  fastify.post(
    '/api/restaurant/menu-items',
    {
      preHandler: [authenticate, authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const parseResult = createMenuItemSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid menu item payload',
          },
        });
      }

      const item = await MenuService.createMenuItem(request.user.id, parseResult.data);
      return reply.status(201).send({ message: 'Menu item created successfully', item });
    }
  );

  // PATCH /api/restaurant/menu-items/:id
  fastify.patch(
    '/api/restaurant/menu-items/:id',
    {
      preHandler: [authenticate, authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const { id } = request.params as { id: string };
      const parseResult = updateMenuItemSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid menu item update payload',
          },
        });
      }

      const item = await MenuService.updateMenuItem(request.user.id, id, parseResult.data);
      return reply.status(200).send({ message: 'Menu item updated successfully', item });
    }
  );

  // DELETE /api/restaurant/menu-items/:id
  fastify.delete(
    '/api/restaurant/menu-items/:id',
    {
      preHandler: [authenticate, authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const { id } = request.params as { id: string };
      await MenuService.deleteMenuItem(request.user.id, id);
      return reply.status(200).send({ message: 'Menu item deleted successfully' });
    }
  );
}
