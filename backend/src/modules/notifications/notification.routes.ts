import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { Restaurant } from '../../models/restaurant.model.js';
import { PushSubscribeSchema, QueryNotificationsSchema } from './notification.schemas.js';
import { NotificationService } from './notification.service.js';

export async function notificationRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/api/notifications',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const user = request.user!;
      const queryResult = QueryNotificationsSchema.safeParse(request.query);

      const options = queryResult.success ? queryResult.data : { limit: 20, unreadOnly: false };

      let restaurantId: string | undefined;
      if (user.role === 'RESTAURANT_ADMIN') {
        const restaurant = await Restaurant.findOne({ ownerId: user.id });
        if (restaurant) {
          restaurantId = restaurant._id.toString();
        }
      }

      const result = await NotificationService.getNotificationsForUser({
        userId: user.id,
        role: user.role,
        restaurantId,
        limit: options.limit,
        unreadOnly: options.unreadOnly,
      });

      return reply.status(200).send(result);
    }
  );

  fastify.patch(
    '/api/notifications/:id/read',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params as { id: string };

      const notification = await NotificationService.markAsRead(id, user.id);
      if (!notification) {
        return reply.status(404).send({ error: 'Notification not found' });
      }

      return reply.status(200).send({ success: true, notification });
    }
  );

  fastify.patch(
    '/api/notifications/read-all',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const user = request.user!;

      let restaurantId: string | undefined;
      if (user.role === 'RESTAURANT_ADMIN') {
        const restaurant = await Restaurant.findOne({ ownerId: user.id });
        if (restaurant) {
          restaurantId = restaurant._id.toString();
        }
      }

      const result = await NotificationService.markAllAsRead({
        userId: user.id,
        role: user.role,
        restaurantId,
      });

      return reply.status(200).send({ success: true, ...result });
    }
  );

  fastify.post(
    '/api/notifications/push-subscribe',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const user = request.user!;
      const bodyResult = PushSubscribeSchema.safeParse(request.body);

      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: bodyResult.error.flatten().fieldErrors,
        });
      }

      const result = await NotificationService.subscribePush(user.id, user.role, bodyResult.data);
      return reply.status(200).send(result);
    }
  );
}
