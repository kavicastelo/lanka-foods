import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config/index.js';

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  request.log.error({ err: error, reqId: request.id }, 'Unhandled error occurred during request processing');

  const statusCode = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;

  const errorCode =
    statusCode === 400
      ? 'BAD_REQUEST'
      : statusCode === 401
        ? 'UNAUTHORIZED'
        : statusCode === 403
          ? 'FORBIDDEN'
          : statusCode === 404
            ? 'NOT_FOUND'
            : statusCode === 409
              ? 'CONFLICT'
              : statusCode === 413
                ? 'PAYLOAD_TOO_LARGE'
                : statusCode === 429
                  ? 'TOO_MANY_REQUESTS'
                  : 'INTERNAL_SERVER_ERROR';

  const safeMessage =
    statusCode === 500 && config.NODE_ENV === 'production'
      ? 'An unexpected internal server error occurred.'
      : error.message || 'An error occurred while processing your request.';

  reply.status(statusCode).send({
    error: {
      code: errorCode,
      message: safeMessage,
    },
  });
}
