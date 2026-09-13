import { FastifyRequest, FastifyReply } from 'fastify';
import AdmZip from 'adm-zip';
import { crmService } from '../services/crm.service.js';
import { evolutionService } from '../services/evolution.service.js';
import { generateCrmExtensionFiles } from '../services/crm-extension-generator.js';
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
      marketplace_only?: string;
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
      marketplace_only: req.query.marketplace_only === 'true' || req.query.marketplace_only === '1',
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
  req: FastifyRequest<{ Params: { id: string }; Body: { lead_status?: LeadStatus; notes?: string; customer_phone?: string; deal_value?: string } }>,
  reply: FastifyReply
) {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = await crmService.updateStatus(id, req.body.lead_status, req.body.notes, req.body.customer_phone, req.body.deal_value);
    return reply.send({ success: true, data: updated });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message });
  }
}

export async function deleteConversationHandler(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await crmService.deleteConversation(id);
    if (!deleted) {
      return reply.status(404).send({ success: false, error: 'Conversa não encontrada' });
    }
    return reply.send({ success: true, message: 'Conversa excluída com sucesso' });
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

export async function downloadExtensionHandler(
  req: FastifyRequest<{
    Querystring: {
      profile_id?: string;
      api_url?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const profileId = req.query.profile_id ? parseInt(req.query.profile_id, 10) : 1;
    
    // Auto-detect base URL from request headers if not provided
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3001';
    const defaultApiUrl = req.query.api_url || `${proto}://${host}`;

    const files = generateCrmExtensionFiles({
      profileId,
      apiBaseUrl: defaultApiUrl,
    });

    const zip = new AdmZip();
    for (const [filename, content] of Object.entries(files)) {
      if (Buffer.isBuffer(content)) {
        zip.addFile(filename, content);
      } else {
        zip.addFile(filename, Buffer.from(content, 'utf-8'));
      }
    }

    const zipBuffer = zip.toBuffer();

    reply.header('Content-Type', 'application/zip');
    reply.header('Content-Disposition', 'attachment; filename="adsmanager-crm-extension.zip"');
    reply.header('Content-Length', zipBuffer.length);
    return reply.send(zipBuffer);
  } catch (err: any) {
    console.error('[CrmController] Error generating extension zip:', err);
    return reply.status(500).send({ success: false, error: err.message });
  }
}

export async function initCrmTablesHandler(
  _req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { crmRepository } = await import('../repositories/crm.repository.js');
    await crmRepository.ensureCrmTablesExist();
    return reply.send({ success: true, message: 'Tabelas do CRM e índices inicializados com sucesso no banco de dados.' });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message });
  }
}

export async function testWebhookForwardHandler(
  req: FastifyRequest<{ Body?: { target_url?: string } }>,
  reply: FastifyReply
) {
  try {
    const customUrl = (req.body as any)?.target_url || (req.query as any)?.target_url;
    const testPayload = {
      test: true,
      timestamp: new Date().toISOString(),
      source: 'Ads Manager CRM Probe',
      platform: 'facebook',
      conversations: [
        {
          external_id: 'test_123456',
          customer_name: 'Cliente Teste n8n',
          product_title: 'Perfume Teste 25ml',
          last_message: 'Mensagem de teste para verificar se o webhook do n8n está recebendo!',
          last_message_at: new Date().toISOString(),
          unread: true,
        },
      ],
    };

    const result = await crmService.forwardToN8n(testPayload, customUrl);
    return reply.send({ success: result.success, result });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message });
  }
}

export async function syncEvolutionHandler(
  _req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const result = await evolutionService.syncWhatsAppChats();
    return reply.send({ success: true, message: 'Conversas do WhatsApp sincronizadas com sucesso!', stats: result });
  } catch (err: any) {
    console.error('[CrmController] Erro na sincronização do Evolution:', err);
    return reply.status(500).send({ success: false, error: err.message });
  }
}

export async function evolutionWebhookHandler(
  req: FastifyRequest<{ Body: any }>,
  reply: FastifyReply
) {
  try {
    const result = await evolutionService.handleWebhook(req.body);
    return reply.send({ success: true, result });
  } catch (err: any) {
    console.error('[CrmController] Erro no webhook do Evolution:', err);
    return reply.status(500).send({ success: false, error: err.message });
  }
}

export async function bulkUpdateStatusHandler(
  req: FastifyRequest<{ Body: { ids: number[]; lead_status: LeadStatus } }>,
  reply: FastifyReply
) {
  try {
    const { ids, lead_status } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0 || !lead_status) {
      return reply.status(400).send({ success: false, error: 'Parâmetros ids e lead_status são obrigatórios' });
    }
    const updatedCount = await crmService.bulkUpdateStatus(ids, lead_status);
    return reply.send({ success: true, updated_count: updatedCount });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message });
  }
}

export async function bulkDeleteHandler(
  req: FastifyRequest<{ Body: { ids: number[] } }>,
  reply: FastifyReply
) {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.status(400).send({ success: false, error: 'Parâmetro ids obrigatório' });
    }
    const deletedCount = await crmService.bulkDelete(ids);
    return reply.send({ success: true, deleted_count: deletedCount });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message });
  }
}

export async function syncExtensionsHandler(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { dockerManager } = await import('../managers/docker.manager.js');
    const result = await dockerManager.syncAllRunningContainersWithLatestExtension();
    return reply.send({ success: true, ...result });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message });
  }
}

export async function openTabHandler(
  req: FastifyRequest<{ Body: { profile_id?: number; profile_uuid?: string; url: string } }>,
  reply: FastifyReply
) {
  try {
    const { profile_id, profile_uuid, url } = req.body || {};
    if (!url) {
      return reply.status(400).send({ success: false, error: 'URL é obrigatória' });
    }

    const { dockerManager } = await import('../managers/docker.manager.js');
    const { profileRepository } = await import('../repositories/profile.repository.js');

    let targetContainer: string | null = null;
    if (profile_uuid) {
      targetContainer = `browser-profile-${profile_uuid}`;
    } else if (profile_id) {
      const profile = await profileRepository.findById(profile_id);
      if (profile) {
        targetContainer = `browser-profile-${profile.uuid}`;
      }
    }

    if (!targetContainer) {
      const containers = await dockerManager.syncAllRunningContainersWithLatestExtension();
      if (containers.containers.length > 0) {
        targetContainer = containers.containers[0];
      }
    }

    if (!targetContainer) {
      return reply.status(404).send({ success: false, error: 'Nenhum servidor/perfil ativo encontrado' });
    }

    const opened = await dockerManager.openUrlInContainer(targetContainer, url);
    return reply.send({ success: opened, container: targetContainer, url });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message });
  }
}

export async function saveInsightsHandler(
  req: FastifyRequest<{ Body: any }>,
  reply: FastifyReply
) {
  try {
    const payload = req.body;
    if (!payload) {
      return reply.status(400).send({ success: false, error: 'Dados ausentes' });
    }
    const saved = await crmService.saveInsights(payload as any);
    return reply.send({ success: true, data: saved });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message });
  }
}

export async function getInsightsHandler(
  req: FastifyRequest<{ Querystring: { profile_id?: string; timeframe?: string } }>,
  reply: FastifyReply
) {
  try {
    const profileId = req.query.profile_id ? parseInt(req.query.profile_id, 10) : undefined;
    const timeframe = req.query.timeframe ? parseInt(req.query.timeframe, 10) : 30;
    const insights = await crmService.getLatestInsights(profileId, timeframe);
    return reply.send({ success: true, data: insights });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message });
  }
}



