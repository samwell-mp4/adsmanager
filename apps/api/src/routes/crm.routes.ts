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
  getStatusesHandler,
  createStatusHandler,
  updateStatusConfigHandler,
  deleteStatusHandler,
  getTagsHandler,
  createTagHandler,
  deleteTagHandler,
  addLeadTagHandler,
  removeLeadTagHandler,
  getLeadNotesHandler,
  createLeadNoteHandler,
  deleteLeadNoteHandler,
  getFollowupsHandler,
  getLeadFollowupsHandler,
  createFollowupHandler,
  updateFollowupHandler,
  deleteFollowupHandler,
  getLeadTimelineHandler,
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

  // Custom Statuses
  fastify.get('/api/crm/statuses', getStatusesHandler);
  fastify.post('/api/crm/statuses', createStatusHandler);
  fastify.put('/api/crm/statuses/:id', updateStatusConfigHandler);
  fastify.delete('/api/crm/statuses/:id', deleteStatusHandler);

  // Custom Tags
  fastify.get('/api/crm/tags', getTagsHandler);
  fastify.post('/api/crm/tags', createTagHandler);
  fastify.delete('/api/crm/tags/:id', deleteTagHandler);
  fastify.post('/api/crm/conversations/:id/tags', addLeadTagHandler);
  fastify.delete('/api/crm/conversations/:id/tags/:tagId', removeLeadTagHandler);

  // Internal Notes
  fastify.get('/api/crm/conversations/:id/notes', getLeadNotesHandler);
  fastify.post('/api/crm/conversations/:id/notes', createLeadNoteHandler);
  fastify.delete('/api/crm/notes/:noteId', deleteLeadNoteHandler);

  // Follow-ups & Reminders
  fastify.get('/api/crm/followups', getFollowupsHandler);
  fastify.get('/api/crm/conversations/:id/followups', getLeadFollowupsHandler);
  fastify.post('/api/crm/conversations/:id/followups', createFollowupHandler);
  fastify.patch('/api/crm/followups/:id', updateFollowupHandler);
  fastify.delete('/api/crm/followups/:id', deleteFollowupHandler);

  // Customer Timeline Events
  fastify.get('/api/crm/conversations/:id/timeline', getLeadTimelineHandler);

  // Outgoing queue polling for extension
  fastify.get('/api/crm/outgoing', getPendingRepliesHandler);
  fastify.post('/api/crm/outgoing/:id/sent', markOutgoingSentHandler);

  // Download official extension package (.zip)
  fastify.get('/api/crm/extension/download', downloadExtensionHandler);
}




