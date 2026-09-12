import { FastifyRequest, FastifyReply } from 'fastify';
import { crmService } from '../services/crm.service.js';
import { CrmWebhookPayload, LeadStatus, CrmPlatform } from '../types/index.js';

export async function webhookHandler(
  req: FastifyRequest<{ Body: CrmWebhookPayload }>,
  reply: FastifyReply
) {
  try {
    const result = await crmService.processWebhook(req.body);
    return reply.send(result);
  } catch (err: any) {
    console.error('[CrmController] Error processing webhook:', err);
    return reply.status(500).send({ success: false, error: err.message });
  }
}

export async function listConversationsHandler(
  req: FastifyRequest<{
    Querystring: {
      profile_id?: string;
      platform?: CrmPlatform;
      lead_status?: LeadStatus;
      search?: string;
      limit?: string;
      offset?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const filter = {
      profile_id: req.query.profile_id ? parseInt(req.query.profile_id, 10) : undefined,
      platform: req.query.platform,
      lead_status: req.query.lead_status,
      search: req.query.search,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
      offset: req.query.offset ? parseInt(req.query.offset, 10) : 0,
    };
    const conversations = await crmService.listConversations(filter);
    return reply.send({ success: true, data: conversations });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message });
  }
}

export async function getConversationDetailsHandler(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const id = parseInt(req.params.id, 10);
    const details = await crmService.getConversationDetails(id);
    if (!details) {
      return reply.status(404).send({ success: false, error: 'Conversa não encontrada' });
    }
    return reply.send({ success: true, data: details });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message });
  }
}

export async function sendReplyHandler(
  req: FastifyRequest<{ Params: { id: string }; Body: { message: string } }>,
  reply: FastifyReply
) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!req.body?.message || !req.body.message.trim()) {
      return reply.status(400).send({ success: false, error: 'Mensagem vazia' });
    }
    const result = await crmService.sendReply(id, req.body.message);
    return reply.send(result);
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message });
  }
}

export async function updateLeadStatusHandler(
  req: FastifyRequest<{ Params: { id: string }; Body: { lead_status: LeadStatus; notes?: string } }>,
  reply: FastifyReply
) {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = await crmService.updateStatus(id, req.body.lead_status, req.body.notes);
    return reply.send({ success: true, data: updated });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message });
  }
}

export async function getPendingRepliesHandler(
  req: FastifyRequest<{ Querystring: { profile_id?: string } }>,
  reply: FastifyReply
) {
  try {
    const profileId = req.query.profile_id ? parseInt(req.query.profile_id, 10) : 0;
    const replies = await crmService.getPendingReplies(profileId);
    return reply.send({ success: true, data: replies });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message });
  }
}

export async function markOutgoingSentHandler(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const id = parseInt(req.params.id, 10);
    await crmService.markReplySent(id);
    return reply.send({ success: true });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message });
  }
}
