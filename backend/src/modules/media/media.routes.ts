import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { deleteMediaSchema, requestUploadUrlSchema, uploadMediaSchema } from './media.schemas.js';
import { MediaService } from './media.service.js';

export async function mediaRoutes(fastify: FastifyInstance) {
  // POST /api/media/upload-url (Generate server-authoritative presigned R2 upload URL)
  fastify.post(
    '/api/media/upload-url',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const parseResult = requestUploadUrlSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid media upload request',
          },
        });
      }

      const result = await MediaService.requestUploadUrl(
        request.user.id,
        request.user.role,
        parseResult.data
      );
      return reply.status(200).send(result);
    }
  );

  // POST /api/media/upload (Server proxy R2 upload with base64 data to bypass browser CORS)
  fastify.post(
    '/api/media/upload',
    {
      bodyLimit: 10 * 1024 * 1024,
      preHandler: [authenticate],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const parseResult = uploadMediaSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid upload media payload',
          },
        });
      }

      const result = await MediaService.uploadMediaDirectly(
        request.user.id,
        request.user.role,
        parseResult.data
      );
      return reply.status(200).send(result);
    }
  );

  // DELETE /api/media (Delete media object from storage with authorization check)
  fastify.delete(
    '/api/media',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const parseResult = deleteMediaSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: parseResult.error.errors[0]?.message || 'Invalid delete media request',
          },
        });
      }

      const result = await MediaService.deleteMedia(
        request.user.id,
        request.user.role,
        parseResult.data
      );
      return reply.status(200).send(result);
    }
  );
}
