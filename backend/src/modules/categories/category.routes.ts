import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { createCategorySchema, updateCategorySchema } from './category.schemas.js';
import { CategoryService } from './category.service.js';

export async function categoryRoutes(fastify: FastifyInstance) {
  // GET /api/categories (Public discovery)
  fastify.get('/api/categories', async (_request, reply) => {
    const categories = await CategoryService.listActiveCategories();
    return reply.status(200).send({ categories });
  });

  // POST /api/admin/categories (SuperAdmin creation)
  fastify.post(
    '/api/admin/categories',
    {
      preHandler: [authenticate, authorize(['SUPER_ADMIN'])],
    },
    async (request, reply) => {
      const parseResult = createCategorySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid category payload',
          },
        });
      }

      const category = await CategoryService.createCategory(parseResult.data);
      return reply.status(201).send({ message: 'Category created successfully', category });
    }
  );

  // PATCH /api/admin/categories/:id (SuperAdmin update)
  fastify.patch(
    '/api/admin/categories/:id',
    {
      preHandler: [authenticate, authorize(['SUPER_ADMIN'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parseResult = updateCategorySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid category update payload',
          },
        });
      }

      const category = await CategoryService.updateCategory(id, parseResult.data);
      return reply.status(200).send({ message: 'Category updated successfully', category });
    }
  );

  // DELETE /api/admin/categories/:id (SuperAdmin soft-deactivation)
  fastify.delete(
    '/api/admin/categories/:id',
    {
      preHandler: [authenticate, authorize(['SUPER_ADMIN'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const category = await CategoryService.deleteCategory(id);
      return reply.status(200).send({ message: 'Category deactivated successfully', category });
    }
  );
}
