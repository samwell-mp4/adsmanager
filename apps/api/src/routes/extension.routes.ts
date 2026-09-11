import { FastifyInstance } from 'fastify';
import {
  uploadProfileExtensionHandler,
  listProfileExtensionsHandler,
  deleteProfileExtensionHandler,
  uploadGlobalExtensionHandler,
  listGlobalExtensionsHandler,
  deleteGlobalExtensionHandler,
} from '../controllers/extension.controller.js';

export async function extensionRoutes(fastify: FastifyInstance) {
  // Profile-specific custom extensions
  fastify.post('/profiles/:id/extensions/upload', uploadProfileExtensionHandler);
  fastify.get('/profiles/:id/extensions', listProfileExtensionsHandler);
  fastify.delete('/profiles/:id/extensions/:extId', deleteProfileExtensionHandler);

  // Global extensions catalog
  fastify.post('/extensions/upload', uploadGlobalExtensionHandler);
  fastify.get('/extensions', listGlobalExtensionsHandler);
  fastify.delete('/extensions/:extId', deleteGlobalExtensionHandler);
}
