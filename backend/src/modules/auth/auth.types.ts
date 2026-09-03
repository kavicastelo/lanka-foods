import '@fastify/jwt';
import type { UserRole } from '../../models/user.model.js';

export interface JWTPayload {
  sub: string; // User ObjectId string
  role: UserRole;
  email: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}

// Augment @fastify/jwt types
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload;
    user: AuthenticatedUser;
  }
}
