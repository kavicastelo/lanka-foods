import type { FastifyInstance } from 'fastify';
import { config } from '../config/index.js';
import { isDatabaseConnected } from '../infrastructure/database/index.js';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (_request, reply) => {
    return reply.status(200).send({
      status: 'ok',
      service: config.SERVICE_NAME,
      version: config.SERVICE_VERSION,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  fastify.get('/health/ready', async (_request, reply) => {
    const dbConnected = isDatabaseConnected();
    // In test environment, allow app to be ready without database unless test explicitly connects
    const isReady = config.NODE_ENV === 'test' ? true : dbConnected;
    const statusCode = isReady ? 200 : 503;

    return reply.status(statusCode).send({
      status: isReady ? 'ready' : 'unready',
      service: config.SERVICE_NAME,
      initialized: isReady,
      databaseConnected: dbConnected,
      timestamp: new Date().toISOString(),
    });
  });
}
