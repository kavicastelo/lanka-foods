import type { FastifyReply, FastifyRequest } from 'fastify';
import { User } from '../models/user.model.js';
import type { JWTPayload } from '../modules/auth/auth.types.js';

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token is required.',
        },
      });
    }

    // Fastify JWT verify
    const decoded = await request.jwtVerify<JWTPayload>();
    if (!decoded || !decoded.sub) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid token payload.',
        },
      });
    }

    // Role Freshness & Account State Database Check
    const user = await User.findById(decoded.sub);
    if (!user || !user.isActive) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User account is inactive or no longer exists.',
        },
      });
    }

    // Attach verified identity to request context
    request.user = {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
    };
  } catch (_err) {
    return reply.status(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired authentication token.',
      },
    });
  }
}
