import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Session } from '../auth/supertokens';
import { storageService } from '../services/storage';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PhotoUploadRequest extends FastifyRequest {
  body: {
    filename: string;
    mimeType: string;
  };
}

interface PhotoDeleteRequest extends FastifyRequest {
  params: {
    filename: string;
  };
}

export async function photoRoutes(fastify: FastifyInstance) {
  // Middleware to require authentication
  const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const session = await Session.getSession(request as any, reply as any);
      if (!session) {
        reply.code(401).send({ error: 'Authentication required' });
        return;
      }
      (request as any).userId = session.getUserId();
    } catch (error) {
      reply.code(401).send({ error: 'Invalid session' });
      return;
    }
  };

  // Generate presigned upload URL
  fastify.post(
    '/api/photos/upload-url',
    {
      preHandler: requireAuth,
      schema: {
        body: {
          type: 'object',
          required: ['filename', 'mimeType'],
          properties: {
            filename: { type: 'string' },
            mimeType: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as { filename: string; mimeType: string };
        if (!body?.filename || !body?.mimeType) {
          reply.code(400).send({ success: false, error: 'filename and mimeType are required' });
          return;
        }
        const { filename, mimeType } = body;
        const userId = (request as any).userId;

        // Validate filename and mime type
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedMimeTypes.includes(mimeType)) {
          reply.code(400).send({ success: false, error: 'Unsupported mime type' });
          return;
        }
        const safeName = String(filename).replace(/[^a-zA-Z0-9_.-]/g, '_');

        const result = await storageService.generatePresignedUploadUrl(userId, safeName, mimeType);

        reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        console.error('❌ Upload URL generation failed:', error);
        reply.code(400).send({
          success: false,
          error: error instanceof Error ? error.message : 'Upload URL generation failed',
        });
      }
    },
  );

  // Direct photo upload endpoint
  fastify.post(
    '/api/photos/upload',
    {
      preHandler: requireAuth,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;

        // Handle multipart file upload
        const data = await request.file();
        if (!data) {
          reply.code(400).send({ error: 'No file provided' });
          return;
        }

        // Validate mime type and sanitize filename
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedMimeTypes.includes(data.mimetype)) {
          reply.code(400).send({ error: 'Unsupported mime type' });
          return;
        }

        const safeName = String(data.filename).replace(/[^a-zA-Z0-9_.-]/g, '_');

        const buffer = await data.toBuffer();
        const result = await storageService.uploadPhoto(buffer, safeName, data.mimetype, userId);

        // Update user's profile with the new photo URL
        const profile = await prisma.profile.findUnique({
          where: { userId },
        });

        if (profile) {
          const updatedPhotos = [...profile.photos, result.url];
          await prisma.profile.update({
            where: { userId },
            data: { photos: updatedPhotos },
          });
        }

        reply.send({
          success: true,
          data: {
            url: result.url,
            thumbnailUrl: result.thumbnailUrl,
            filename: result.filename,
          },
        });
      } catch (error) {
        console.error('❌ Photo upload failed:', error);
        reply.code(400).send({
          success: false,
          error: error instanceof Error ? error.message : 'Photo upload failed',
        });
      }
    },
  );

  // Delete photo endpoint
  fastify.delete(
    '/api/photos/:filename',
    {
      preHandler: requireAuth,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { filename: string };
        const { filename } = params;
        const userId = (request as any).userId;

        // Remove from storage
        await storageService.deletePhoto(userId, filename);

        // Update user's profile to remove the photo URL
        const profile = await prisma.profile.findUnique({
          where: { userId },
        });

        if (profile) {
          const updatedPhotos = profile.photos.filter((photo) => !photo.includes(filename));
          await prisma.profile.update({
            where: { userId },
            data: { photos: updatedPhotos },
          });
        }

        reply.send({
          success: true,
          message: 'Photo deleted successfully',
        });
      } catch (error) {
        console.error('❌ Photo deletion failed:', error);
        reply.code(400).send({
          success: false,
          error: error instanceof Error ? error.message : 'Photo deletion failed',
        });
      }
    },
  );

  // List user's photos
  fastify.get(
    '/api/photos',
    {
      preHandler: requireAuth,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;

        const photos = await storageService.listUserPhotos(userId);

        reply.send({
          success: true,
          data: { photos },
        });
      } catch (error) {
        console.error('❌ Photo listing failed:', error);
        reply.code(500).send({
          success: false,
          error: 'Failed to list photos',
        });
      }
    },
  );

  // Photo processing webhook (for future use with async processing)
  fastify.post(
    '/api/photos/webhook/processed',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // This endpoint can be used for async photo processing notifications
        // For now, just acknowledge the webhook
        reply.send({ success: true });
      } catch (error) {
        console.error('❌ Photo webhook failed:', error);
        reply.code(500).send({ error: 'Webhook processing failed' });
      }
    },
  );
}
