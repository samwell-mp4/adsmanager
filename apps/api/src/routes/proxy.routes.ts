import { FastifyInstance } from 'fastify';
import {
  createProxyHandler,
  deleteProxyHandler,
  getProxyHandler,
  listProxiesHandler,
  testProxyHandler,
  updateProxyHandler,
} from '../controllers/proxy.controller.js';

export async function proxyRoutes(fastify: FastifyInstance) {
  fastify.get('/api/proxies', listProxiesHandler);
  fastify.get('/api/proxies/:id', getProxyHandler);
  fastify.post('/api/proxies', createProxyHandler);
  fastify.patch('/api/proxies/:id', updateProxyHandler);
  fastify.delete('/api/proxies/:id', deleteProxyHandler);
  fastify.post('/api/proxies/:id/test', testProxyHandler);
}
