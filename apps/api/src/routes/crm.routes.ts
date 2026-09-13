import { FastifyInstance } from 'fastify';
import {
  webhookHandler,
  listConversationsHandler,
  getConversationDetailsHandler,
  sendReplyHandler,
  updateLeadStatusHandler,
  deleteConversationHandler,
  getPendingRepliesHandler,
  markOutgoingSentHandler,
  downloadExtensionHandler,
  initCrmTablesHandler,
  testWebhookForwardHandler,
  syncEvolutionHandler,
  evolutionWebhookHandler,
  bulkUpdateStatusHandler,
  bulkDeleteHandler,
  syncExtensionsHandler,
  openTabHandler,
  saveInsightsHandler,
  getInsightsHandler,
} from '../controllers/crm.controller.js';

export async function crmRoutes(fastify: FastifyInstance) {
  // Webhook for browser extension
  fastify.post('/api/crm/webhook', webhookHandler);

  // Instagram Insights endpoints
  fastify.post('/api/crm/insights', saveInsightsHandler);
  fastify.get('/api/crm/insights', getInsightsHandler);

  // Trigger test forward to n8n webhook
  fastify.post('/api/crm/test-webhook', testWebhookForwardHandler);
  fastify.get('/api/crm/test-webhook', testWebhookForwardHandler);

  // Initialize and repair CRM database tables if needed
  fastify.get('/api/crm/init', initCrmTablesHandler);

  // Evolution API (WhatsApp) endpoints
  fastify.post('/api/crm/evolution/sync', syncEvolutionHandler);
  fastify.get('/api/crm/evolution/sync', syncEvolutionHandler);
  fastify.post('/api/crm/evolution/webhook', evolutionWebhookHandler);
  fastify.get('/api/crm/evolution/webhook', evolutionWebhookHandler);

  // Synchronize extensions across all running browser containers
  fastify.post('/api/crm/sync-extensions', syncExtensionsHandler);
  fastify.get('/api/crm/sync-extensions', syncExtensionsHandler);

  // Open URL as tab in running browser container
  fastify.post('/api/crm/open-tab', openTabHandler);

  // CRM Dashboard endpoints
  fastify.get('/api/crm/conversations', listConversationsHandler);
  fastify.get('/api/crm/conversations/:id', getConversationDetailsHandler);
  fastify.post('/api/crm/conversations/:id/reply', sendReplyHandler);
  fastify.patch('/api/crm/conversations/:id/status', updateLeadStatusHandler);
  fastify.delete('/api/crm/conversations/:id', deleteConversationHandler);

  // Bulk operations
  fastify.post('/api/crm/conversations/bulk-status', bulkUpdateStatusHandler);
  fastify.post('/api/crm/conversations/bulk-delete', bulkDeleteHandler);

  // Outgoing queue polling for extension
  fastify.get('/api/crm/outgoing', getPendingRepliesHandler);
  fastify.post('/api/crm/outgoing/:id/sent', markOutgoingSentHandler);

  // Download official extension package (.zip)
  fastify.get('/api/crm/extension/download', downloadExtensionHandler);
}



