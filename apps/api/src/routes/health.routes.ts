import { FastifyInstance } from 'fastify';
import { healthHandler } from '../controllers/health.controller.js';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', healthHandler);
}
