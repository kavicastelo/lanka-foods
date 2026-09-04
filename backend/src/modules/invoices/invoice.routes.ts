import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { Restaurant } from '../../models/restaurant.model.js';
import {
  generateInvoiceSchema,
  listInvoicesQuerySchema,
  uploadPaymentSlipSchema,
} from './invoice.schemas.js';
import { InvoiceService } from './invoice.service.js';

export async function invoiceRoutes(fastify: FastifyInstance) {
  // POST /api/admin/invoices/generate (Super Admin periodic invoice creation)
  fastify.post(
    '/api/admin/invoices/generate',
    {
      preHandler: [authenticate, authorize(['SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const parseResult = generateInvoiceSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid invoice generation payload',
          },
        });
      }

      const invoice = await InvoiceService.generateInvoice(request.user.id, parseResult.data);
      return reply.status(201).send({ message: 'Invoice generated successfully', invoice });
    }
  );

  // GET /api/admin/invoices (Super Admin listing of all platform invoices)
  fastify.get(
    '/api/admin/invoices',
    {
      preHandler: [authenticate, authorize(['SUPER_ADMIN'])],
    },
    async (request, reply) => {
      const parseResult = listInvoicesQuerySchema.safeParse(request.query);
      const query = parseResult.success
        ? parseResult.data
        : { page: 1, limit: 50 };
      const result = await InvoiceService.listInvoices(query);
      return reply.status(200).send(result);
    }
  );

  // GET /api/restaurant/invoices (Restaurant Admin listing of owner's invoices)
  fastify.get(
    '/api/restaurant/invoices',
    {
      preHandler: [authenticate, authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const ownerRestaurant = await Restaurant.findOne({ ownerId: request.user.id });
      if (!ownerRestaurant && request.user.role !== 'SUPER_ADMIN') {
        return reply.status(200).send({ data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 1 } });
      }

      const parseResult = listInvoicesQuerySchema.safeParse(request.query);
      const query = parseResult.success ? parseResult.data : { page: 1, limit: 50 };
      if (ownerRestaurant) {
        query.restaurantId = ownerRestaurant._id.toString();
      }

      const result = await InvoiceService.listInvoices(query);
      return reply.status(200).send(result);
    }
  );

  // GET /api/invoices/:id (Single invoice detail lookup)
  fastify.get(
    '/api/invoices/:id',
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
      const invoice = await InvoiceService.getInvoiceById(request.user.id, request.user.role, id);
      return reply.status(200).send({ invoice });
    }
  );

  // POST /api/invoices/:id/payment-slip (Restaurant Admin payment slip upload)
  fastify.post(
    '/api/invoices/:id/payment-slip',
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
      const parseResult = uploadPaymentSlipSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid payment slip payload',
          },
        });
      }

      const invoice = await InvoiceService.uploadPaymentSlip(
        request.user.id,
        id,
        parseResult.data.paymentSlipUrl
      );
      return reply.status(200).send({ message: 'Payment slip uploaded successfully', invoice });
    }
  );

  // PATCH /api/admin/invoices/:id/settle (Super Admin confirm payment & mark paid)
  fastify.patch(
    '/api/admin/invoices/:id/settle',
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
      const invoice = await InvoiceService.markInvoiceAsPaid(request.user.id, id);
      return reply.status(200).send({ message: 'Invoice marked as paid successfully', invoice });
    }
  );
}
