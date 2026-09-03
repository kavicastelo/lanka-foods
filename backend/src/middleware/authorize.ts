import type { FastifyReply, FastifyRequest } from 'fastify';
import type { UserRole } from '../models/user.model.js';

export function authorize(allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required before authorization.',
        },
      });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Insufficient permissions for this resource.',
        },
      });
    }
  };
}
