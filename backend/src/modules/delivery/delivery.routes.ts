import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { Delivery } from '../../models/delivery.model.js';
import { Order } from '../../models/order.model.js';
import { Restaurant } from '../../models/restaurant.model.js';
import { DeliveryService, type UpdateDeliverySettingsInput } from './delivery.service.js';

export async function deliveryRoutes(fastify: FastifyInstance) {
  // 1. Restaurant Delivery Settings (Restaurant Admin / Super Admin)
  fastify.get(
    '/api/restaurants/:id/delivery-settings',
    {
      preHandler: [authenticate, authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      if (user.role === 'RESTAURANT_ADMIN') {
        const rest = await Restaurant.findOne({ ownerId: user.id });
        if (!rest || rest._id.toString() !== id) {
          return reply.status(403).send({ error: 'Access denied to this restaurant delivery settings.' });
        }
      }

      const result = await DeliveryService.getDeliverySettings(id);
      return reply.status(200).send(result);
    }
  );

  // 2. Update Restaurant Delivery Settings
  fastify.patch(
    '/api/restaurants/:id/delivery-settings',
    {
      preHandler: [authenticate, authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      if (user.role === 'RESTAURANT_ADMIN') {
        const rest = await Restaurant.findOne({ ownerId: user.id });
        if (!rest || rest._id.toString() !== id) {
          return reply.status(403).send({ error: 'Access denied to update this restaurant delivery settings.' });
        }
      }

      const body = request.body as UpdateDeliverySettingsInput;
      const updated = await DeliveryService.updateDeliverySettings(id, body);
      return reply.status(200).send(updated);
    }
  );

  // 3. Initiate Wolt Connect Onboarding
  fastify.post(
    '/api/restaurants/:id/wolt/connect',
    {
      preHandler: [authenticate, authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      if (user.role === 'RESTAURANT_ADMIN') {
        const rest = await Restaurant.findOne({ ownerId: user.id });
        if (!rest || rest._id.toString() !== id) {
          return reply.status(403).send({ error: 'Access denied.' });
        }
      }

      const connectData = await DeliveryService.initiateWoltConnect(id);
      return reply.status(200).send(connectData);
    }
  );

  // 4. Disconnect Wolt Integration
  fastify.post(
    '/api/restaurants/:id/wolt/disconnect',
    {
      preHandler: [authenticate, authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      if (user.role === 'RESTAURANT_ADMIN') {
        const rest = await Restaurant.findOne({ ownerId: user.id });
        if (!rest || rest._id.toString() !== id) {
          return reply.status(403).send({ error: 'Access denied.' });
        }
      }

      const res = await DeliveryService.disconnectWolt(id);
      return reply.status(200).send(res);
    }
  );

  // 5. Wolt OAuth Callback (Browser Redirect)
  fastify.get(
    '/api/delivery/wolt/callback',
    async (request, reply) => {
      const query = (request.query || {}) as {
        code?: string;
        state?: string;
        venue_id?: string;
        venue_name?: string;
      };
      const { code, state, venue_id, venue_name } = query;

      if (!state) {
        return reply.status(400).send({ error: 'Missing required OAuth state parameter.' });
      }

      try {
        await DeliveryService.handleWoltOAuthCallback(
          code || 'demo_auth_code',
          state,
          venue_id,
          venue_name
        );
        return reply.redirect('/restaurant/dashboard?tab=delivery&status=wolt_connected');
      } catch (err: any) {
        return reply.redirect(
          `/restaurant/dashboard?tab=delivery&status=wolt_error&message=${encodeURIComponent(err.message)}`
        );
      }
    }
  );

  // 6. Real-time Customer Checkout Quote Endpoint
  fastify.post(
    '/api/delivery/quote',
    async (request, reply) => {
      const body = (request.body || {}) as {
        restaurantId?: string;
        dropoffAddress?: string;
        orderSubtotal?: number;
      };
      const { restaurantId, dropoffAddress, orderSubtotal } = body;
      if (!restaurantId || !dropoffAddress) {
        return reply.status(400).send({ error: 'restaurantId and dropoffAddress are required.' });
      }

      const quote = await DeliveryService.calculateCheckoutDeliveryQuote(
        restaurantId,
        dropoffAddress,
        orderSubtotal || 0
      );
      return reply.status(200).send(quote);
    }
  );

  // 7. Dispatch Delivery Order (Restaurant Admin / Super Admin)
  fastify.post(
    '/api/orders/:id/delivery/dispatch',
    {
      preHandler: [authenticate, authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      const result = await DeliveryService.dispatchOrderDelivery(id, user.id, user.role);
      return reply.status(200).send(result);
    }
  );

  // 8. Cancel Delivery Order
  fastify.post(
    '/api/orders/:id/delivery/cancel',
    {
      preHandler: [authenticate, authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;
      const body = (request.body || {}) as { reason?: string };

      const result = await DeliveryService.cancelOrderDelivery(id, user.id, user.role, body.reason);
      return reply.status(200).send(result);
    }
  );

  // 9. Get Delivery Details & Tracking for Order
  fastify.get(
    '/api/orders/:id/delivery',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      const order = await Order.findById(id);
      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      const isCustomer = order.customerId.toString() === user.id;
      let isStaff = user.role === 'SUPER_ADMIN';
      if (user.role === 'RESTAURANT_ADMIN') {
        const r = await Restaurant.findOne({ ownerId: user.id });
        if (r && r._id.toString() === order.restaurantId.toString()) {
          isStaff = true;
        }
      }

      if (!isCustomer && !isStaff) {
        return reply.status(403).send({ error: 'Unauthorized to view this order delivery details.' });
      }

      const delivery = await Delivery.findOne({ orderId: order._id });
      if (!delivery) {
        return reply.status(404).send({ error: 'No delivery has been dispatched for this order.' });
      }

      const responseData: any = {
        id: delivery._id,
        orderId: delivery.orderId,
        provider: delivery.provider,
        deliveryStatus: delivery.deliveryStatus,
        rawProviderStatus: delivery.rawProviderStatus,
        trackingUrl: delivery.trackingUrl,
        pickupEta: delivery.pickupEta,
        deliveryEta: delivery.deliveryEta,
        customerDeliveryFee: delivery.customerDeliveryFee,
        isCod: delivery.isCod,
        codAmountToCollect: delivery.codAmountToCollect,
      };

      if (isStaff) {
        responseData.woltDeliveryCost = delivery.woltDeliveryCost;
        responseData.woltDeliveryId = delivery.woltDeliveryId;
        responseData.pricingStrategy = delivery.pricingStrategy;
      }

      return reply.status(200).send(responseData);
    }
  );

  // 10. Wolt Webhook Handler (Signed JWT / HMAC)
  fastify.post(
    '/api/webhooks/wolt/drive',
    async (request, reply) => {
      const sigHeader =
        (request.headers['wolt-signature'] as string) ||
        (request.headers['x-wolt-signature'] as string) ||
        (request.headers['authorization'] as string);

      const rawBody = JSON.stringify(request.body);
      const res = await DeliveryService.handleWoltWebhook(sigHeader, rawBody);
      return reply.status(200).send(res);
    }
  );

  // 11. Super Admin Delivery Health & Integration Monitor
  fastify.get(
    '/api/admin/delivery/overview',
    {
      preHandler: [authenticate, authorize(['SUPER_ADMIN'])],
    },
    async (_request, reply) => {
      const metrics = await DeliveryService.getSuperAdminDeliveryMetrics();
      return reply.status(200).send(metrics);
    }
  );
}
