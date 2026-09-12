import { FastifyInstance } from 'fastify';
import {
  webhookHandler,
  listConversationsHandler,
  getConversationDetailsHandler,
  sendReplyHandler,
  updateLeadStatusHandler,
  getPendingRepliesHandler,
  markOutgoingSentHandler,
  downloadExtensionHandler,
  initCrmTablesHandler,
  testWebhookForwardHandler,
} from '../controllers/crm.controller.js';

export async function crmRoutes(fastify: FastifyInstance) {
  // Webhook for browser extension
  fastify.post('/api/crm/webhook', webhookHandler);

  // Trigger test forward to n8n webhook
  fastify.post('/api/crm/test-webhook', testWebhookForwardHandler);
  fastify.get('/api/crm/test-webhook', testWebhookForwardHandler);

  // Initialize and repair CRM database tables if needed
  fastify.get('/api/crm/init', initCrmTablesHandler);

  // CRM Dashboard endpoints
  fastify.get('/api/crm/conversations', listConversationsHandler);
  fastify.get('/api/crm/conversations/:id', getConversationDetailsHandler);
  fastify.post('/api/crm/conversations/:id/reply', sendReplyHandler);
  fastify.patch('/api/crm/conversations/:id/status', updateLeadStatusHandler);

  // Outgoing queue polling for extension
  fastify.get('/api/crm/outgoing', getPendingRepliesHandler);
  fastify.post('/api/crm/outgoing/:id/sent', markOutgoingSentHandler);

  // Download official extension package (.zip)
  fastify.get('/api/crm/extension/download', downloadExtensionHandler);
}


