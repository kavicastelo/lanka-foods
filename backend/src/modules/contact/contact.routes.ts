import type { FastifyInstance } from 'fastify';
import { SubmitContactSchema } from './contact.schemas.js';
import { ContactService } from './contact.service.js';

export async function contactRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/api/contact',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const bodyResult = SubmitContactSchema.safeParse(request.body);

      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: bodyResult.error.flatten().fieldErrors,
        });
      }

      const result = await ContactService.submitContactForm(bodyResult.data);
      return reply.status(201).send(result);
    }
  );
}
