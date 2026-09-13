import { FastifyInstance } from 'fastify';
import { shippingController } from '../controllers/shipping.controller.js';

export async function shippingRoutes(fastify: FastifyInstance) {
  fastify.post('/calculate', shippingController.calculate.bind(shippingController));
  fastify.get('/config', shippingController.getConfig.bind(shippingController));
}
