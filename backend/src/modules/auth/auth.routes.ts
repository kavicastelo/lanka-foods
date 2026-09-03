import type { FastifyInstance } from 'fastify';
import { config } from '../../config/index.js';
import { authenticate } from '../../middleware/authenticate.js';
import { loginSchema, registerSchema } from './auth.schemas.js';
import { AuthService } from './auth.service.js';
import type { JWTPayload } from './auth.types.js';

export async function authRoutes(fastify: FastifyInstance) {
  const rateLimitMax = config.NODE_ENV === 'test' ? 100 : 10;

  // POST /api/auth/register
  fastify.post(
    '/api/auth/register',
    {
      config: {
        rateLimit: {
          max: rateLimitMax,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const parseResult = registerSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid registration payload',
          },
        });
      }

      const newUser = await AuthService.registerUser(parseResult.data);

      // Generate JWT token
      const tokenPayload: JWTPayload = {
        sub: newUser._id.toString(),
        role: newUser.role,
        email: newUser.email,
      };
      const token = fastify.jwt.sign(tokenPayload);

      return reply.status(201).send({
        message: 'Registration successful',
        token,
        user: {
          id: newUser._id.toString(),
          email: newUser.email,
          fullName: newUser.fullName,
          phone: newUser.phone,
          role: newUser.role,
        },
      });
    }
  );

  // POST /api/auth/login
  fastify.post(
    '/api/auth/login',
    {
      config: {
        rateLimit: {
          max: rateLimitMax,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const parseResult = loginSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid login payload',
          },
        });
      }

      const user = await AuthService.loginUser(parseResult.data);

      const tokenPayload: JWTPayload = {
        sub: user._id.toString(),
        role: user.role,
        email: user.email,
      };
      const token = fastify.jwt.sign(tokenPayload);

      return reply.status(200).send({
        message: 'Login successful',
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          role: user.role,
        },
      });
    }
  );

  // GET /api/auth/me
  fastify.get(
    '/api/auth/me',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const user = await AuthService.getAuthenticatedProfile(request.user.id);

      return reply.status(200).send({
        user: {
          id: user._id.toString(),
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
        },
      });
    }
  );
}
