import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  createOrderSchema,
  customerOrdersQuerySchema,
  restaurantOrdersQuerySchema,
  updateOrderStatusSchema,
} from './order.schemas.js';
import { OrderService } from './order.service.js';

export async function orderRoutes(fastify: FastifyInstance) {
  // POST /api/orders (Authenticated order placement engine)
  fastify.post(
    '/api/orders',
    {
      preHandler: [authenticate, authorize(['CUSTOMER', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const parseResult = createOrderSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid order payload',
          },
        });
      }

      const order = await OrderService.createOrder(request.user.id, parseResult.data);
      return reply.status(201).send({ message: 'Order placed successfully', order });
    }
  );

  // GET /api/orders/my-orders (Customer paginated order list)
  fastify.get(
    '/api/orders/my-orders',
    {
      preHandler: [authenticate, authorize(['CUSTOMER', 'RESTAURANT_ADMIN', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const parseResult = customerOrdersQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid query parameters',
          },
        });
      }

      const result = await OrderService.getCustomerOrders(request.user.id, parseResult.data);
      return reply.status(200).send(result);
    }
  );

  // GET /api/restaurant/orders (Restaurant Admin paginated order list)
  fastify.get(
    '/api/restaurant/orders',
    {
      preHandler: [authenticate, authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const parseResult = restaurantOrdersQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid query parameters',
          },
        });
      }

      const result = await OrderService.getRestaurantOrders(request.user.id, parseResult.data);
      return reply.status(200).send(result);
    }
  );

  // PATCH /api/orders/:id/status (Server-authoritative status transition update)
  fastify.patch(
    '/api/orders/:id/status',
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
      const parseResult = updateOrderStatusSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid status payload',
          },
        });
      }

      const order = await OrderService.updateOrderStatus(
        request.user.id,
        request.user.role,
        id,
        parseResult.data.status
      );

      return reply.status(200).send({ message: 'Order status updated successfully', order });
    }
  );

  // GET /api/orders/:id (Order detail lookup with strict authorization check)
  fastify.get(
    '/api/orders/:id',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const { id } = request.params as { id: string };
      const order = await OrderService.getOrderById(request.user.id, request.user.role, id);
      return reply.status(200).send({ order });
    }
  );

  // GET /api/admin/orders (Authenticated Super Admin query for all platform orders)
  fastify.get(
    '/api/admin/orders',
    {
      preHandler: [authenticate, authorize(['SUPER_ADMIN'])],
    },
    async (request, reply) => {
      const parseResult = restaurantOrdersQuerySchema.safeParse(request.query);
      const query = parseResult.success
        ? parseResult.data
        : { page: 1, limit: 100 };
      const result = await OrderService.getAllAdminOrders(query);
      return reply.status(200).send(result);
    }
  );
}

