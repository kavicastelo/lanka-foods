import type { FastifyReply, FastifyRequest } from 'fastify';

export function notFoundHandler(request: FastifyRequest, reply: FastifyReply) {
  reply.status(404).send({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
    },
  });
}
