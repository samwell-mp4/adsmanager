import { crmRepository } from '../repositories/crm.repository.js';
import { profileRepository } from '../repositories/profile.repository.js';
import { dockerManager } from '../managers/docker.manager.js';
import { CrmConversation, CrmMessage, CrmOutgoingMessage, CrmWebhookPayload, LeadStatus, CrmPlatform, CrmInsightData, CreateOrderInput, CrmOrder } from '../types/index.js';
import { evolutionService } from './evolution.service.js';

export const DEFAULT_N8N_WEBHOOK = 'https://plug-sales-dispatch-app-n8n-2.hx8235.easypanel.host/webhook/adsmanager';

export const DEFAULT_N8N_TEST_WEBHOOK = 'https://plug-sales-dispatch-app-n8n-2.hx8235.easypanel.host/webhook-test/adsmanager';

export class CrmService {
  /**
   * Forwards webhook payload to n8n workflow
   */
  async forwardToN8n(payload: any, customUrl?: string): Promise<{ success: boolean; status?: number; response?: any; error?: string }> {
    const targetUrl = customUrl || process.env.N8N_WEBHOOK_URL || DEFAULT_N8N_WEBHOOK;
    console.log(`[CrmService] Forwarding payload (${payload.conversations?.length || 0} conversations) to n8n: ${targetUrl}`);

    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let resData: any = null;
      try {
        resData = await res.json();
      } catch {
        resData = await res.text();
      }

      if (res.ok) {
        console.log(`[CrmService] n8n webhook SUCCESS [${res.status}]:`, resData);
        return { success: true, status: res.status, response: resData };
      }

      // If production URL gives 404, check if test URL is active (common during n8n workflow creation)
      if (res.status === 404 && targetUrl === DEFAULT_N8N_WEBHOOK) {
        console.warn(`[CrmService] n8n production webhook returned 404. Attempting test webhook fallback: ${DEFAULT_N8N_TEST_WEBHOOK}...`);
        try {
          const testRes = await fetch(DEFAULT_N8N_TEST_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          let testData: any = null;
          try { testData = await testRes.json(); } catch { testData = await testRes.text(); }

          if (testRes.ok) {
            console.log(`[CrmService] n8n test webhook SUCCESS [${testRes.status}]:`, testData);
            return { success: true, status: testRes.status, response: testData };
          }
        } catch (testErr: any) {
          console.warn(`[CrmService] Test webhook attempt:`, testErr.message);
        }
      }

      console.warn(`[CrmService] n8n webhook returned status ${res.status}:`, resData);
      return { success: false, status: res.status, response: resData, error: `n8n returned status ${res.status}` };
    } catch (err: any) {
      console.error(`[CrmService] Failed forwarding to n8n webhook:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Ingests webhook data sent from the Chrome Extension
   */
  async processWebhook(payload: CrmWebhookPayload): Promise<{ success: boolean; synced_conversations: number; synced_messages: number; n8n_forward?: any }> {
    let profileId = payload.profile_id || null;

    if (!profileId && payload.profile_uuid) {
      const profile = await profileRepository.findByUuid(payload.profile_uuid);
      if (profile) profileId = profile.id;
    }

    let syncedConvs = 0;
    let syncedMsgs = 0;

    if (!payload.conversations || !Array.isArray(payload.conversations)) {
      // Still forward empty/test ping if received
      const forwardRes = await this.forwardToN8n(payload);
      return { success: true, synced_conversations: 0, synced_messages: 0, n8n_forward: forwardRes };
    }

    for (const convData of payload.conversations) {
      if (!convData.external_id) continue;

      const conversation = await crmRepository.upsertConversation({
        profile_id: profileId,
        platform: payload.platform || 'facebook',
        external_id: convData.external_id,
        customer_name: convData.customer_name || 'Cliente',
        customer_avatar: convData.customer_avatar || null,
        product_title: convData.product_title || null,
        product_price: convData.product_price || null,
        product_image: convData.product_image || null,
        product_url: convData.product_url || null,
        last_message: convData.last_message || null,
        last_message_at: convData.last_message_at ? new Date(convData.last_message_at) : new Date(),
        unread_count: convData.unread ? 1 : 0,
      });

      if (!conversation) continue;

      syncedConvs++;

      // Save messages if present
      if (convData.messages && Array.isArray(convData.messages)) {
        for (const msg of convData.messages) {
          if (!msg.content || !msg.content.trim()) continue;
          await crmRepository.saveMessage({
            conversation_id: conversation.id,
            sender_type: msg.sender_type || 'customer',
            sender_name: msg.sender_name || (msg.sender_type === 'me' ? 'Atendente' : convData.customer_name),
            content: msg.content.trim(),
            external_id: msg.external_id || null,
            sent_at: msg.sent_at ? new Date(msg.sent_at) : new Date(),
          });
          syncedMsgs++;
        }
      }
    }

    console.log(`[CrmService] Processed webhook: ${syncedConvs} conversations, ${syncedMsgs} messages for profile #${profileId}`);

    // Asynchronously forward full data to n8n webhook so external workflows receive the event!
    const n8nForward = await this.forwardToN8n({
      ...payload,
      profile_id: profileId,
      synced_at: new Date().toISOString(),
      stats: { synced_conversations: syncedConvs, synced_messages: syncedMsgs }
    });

    return { success: true, synced_conversations: syncedConvs, synced_messages: syncedMsgs, n8n_forward: n8nForward };
  }

  /**
   * Lists unified conversations
   */
  async listConversations(filter: {
    profile_id?: number;
    platform?: CrmPlatform;
    lead_status?: LeadStatus | string;
    tag_id?: number;
    search?: string;
    marketplace_only?: boolean;
    limit?: number;
    offset?: number;
  }) {
    return crmRepository.listConversations(filter);
  }

  /**
   * Gets conversation with its messages
   */
  /**
   * Gets conversation with its messages
   */
  async getConversationDetails(id: number) {
    const conversation = await crmRepository.getConversationById(id);
    if (!conversation) return null;

    // Reset unread count when viewed
    if (conversation.unread_count > 0) {
      await crmRepository.updateConversationLead(id, { unread_count: 0 });
      conversation.unread_count = 0;
    }

    let messages = await crmRepository.getMessagesByConversationId(id, 100);

    // Se for conversa do WhatsApp, sincroniza as mensagens mais recentes do Evolution API automaticamente
    if (conversation.platform === 'whatsapp') {
      try {
        const remoteMessages = await evolutionService.fetchMessages(conversation.external_id, 50);
        if (remoteMessages && remoteMessages.length > 0) {
          for (const rm of remoteMessages) {
            const msgObj = rm.message || {};
            const text =
              msgObj.conversation ||
              msgObj.extendedTextMessage?.text ||
              msgObj.imageMessage?.caption ||
              msgObj.buttonsResponseMessage?.selectedDisplayText;
            if (!text) continue;

            const isMe = Boolean(rm.key?.fromMe);
            let sentAt = new Date();
            if (rm.messageTimestamp) {
              const ts = typeof rm.messageTimestamp === 'number' ? rm.messageTimestamp : parseInt(rm.messageTimestamp, 10);
              if (ts > 0) sentAt = new Date(ts > 100000000000 ? ts : ts * 1000);
            }

            await crmRepository.saveMessage({
              conversation_id: conversation.id,
              sender_type: isMe ? 'me' : 'customer',
              sender_name: isMe ? 'Atendente' : (conversation.customer_name || 'Cliente'),
              content: text,
              sent_at: sentAt,
              external_id: rm.key?.id,
            });
          }
          messages = await crmRepository.getMessagesByConversationId(id, 100);
        }
      } catch (err: any) {
        console.warn('[CrmService] Falha ao sincronizar mensagens remotas do WhatsApp:', err.message);
      }
    }

    return {
      conversation,
      messages,
    };
  }

  /**
   * Sends a reply from the operator dashboard to the customer via extension or CDP or Evolution API
   */
  async sendReply(
    conversationId: number,
    messageText: string,
    mediaUrl?: string
  ): Promise<{ success: boolean; message?: string; outgoing_id?: number }> {
    const conversation = await crmRepository.getConversationById(conversationId);
    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }

    const cleanText = (messageText || '').trim();
    const finalContent = mediaUrl
      ? cleanText
        ? `${cleanText}\n\n📷 ${mediaUrl}`
        : `📷 ${mediaUrl}`
      : cleanText;

    // 1. WhatsApp Evolution API envio direto
    if (conversation.platform === 'whatsapp') {
      const sentDate = new Date();
      await crmRepository.saveMessage({
        conversation_id: conversation.id,
        sender_type: 'me',
        sender_name: 'Atendente',
        content: finalContent,
        sent_at: sentDate,
      });

      await crmRepository.upsertConversation({
        profile_id: conversation.profile_id || 1,
        platform: 'whatsapp',
        external_id: conversation.external_id,
        customer_name: conversation.customer_name,
        last_message: finalContent,
        last_message_at: sentDate,
      });

      let res: any;
      if (mediaUrl) {
        res = await evolutionService.sendMediaMessage(conversation.external_id, mediaUrl, cleanText);
      } else {
        res = await evolutionService.sendTextMessage(conversation.external_id, cleanText);
      }

      if (!res.success) {
        throw new Error(res.error || 'Erro ao enviar via WhatsApp (Evolution API)');
      }

      return {
        success: true,
        message: mediaUrl ? 'Mídia enviada com sucesso no WhatsApp!' : 'Mensagem enviada com sucesso no WhatsApp!',
      };
    }

    if (!conversation.profile_id) {
      throw new Error('Perfil de navegador associado não encontrado');
    }

    // 1. Immediately save our reply in the CRM messages database
    await crmRepository.saveMessage({
      conversation_id: conversation.id,
      sender_type: 'me',
      sender_name: 'Atendente',
      content: finalContent,
      sent_at: new Date(),
    });

    // 2. Update conversation last_message
    await crmRepository.upsertConversation({
      profile_id: conversation.profile_id,
      platform: conversation.platform,
      external_id: conversation.external_id,
      customer_name: conversation.customer_name,
      last_message: finalContent,
      last_message_at: new Date(),
    });

    // 3. Queue reply for the Chrome Extension
    const outgoing = await crmRepository.enqueueReply({
      conversation_id: conversation.id,
      profile_id: conversation.profile_id,
      platform: conversation.platform,
      external_id: conversation.external_id,
      message_text: messageText.trim(),
    });


    // 4. Try active CDP injection if profile container is online
    const profile = await profileRepository.findById(conversation.profile_id);
    if (profile && profile.cdp_port && profile.status === 'running') {
      try {
        const { automationService } = await import('./automation.service.js');
        const chromium = await automationService.getChromium();
        const endpoint = await dockerManager.getCdpTargetForPort(profile.cdp_port);
        const browser = await chromium.connectOverCDP(endpoint);
        try {
          const context = browser.contexts()[0];
          if (context) {
            const pages = context.pages();
            const activeTab = pages.find((p) => p.url().includes(conversation.external_id) || p.url().includes('facebook.com/messages'));
            if (activeTab) {
              console.log(`[CrmService] Found active tab for thread ${conversation.external_id}. Typing reply over CDP...`);
              
              // Selector for message input in Facebook Messenger / Marketplace
              const inputSelector = '[role="textbox"], [contenteditable="true"], div[aria-label="Mensagem"], div[aria-label="Message"]';
              await activeTab.waitForSelector(inputSelector, { timeout: 3000 });
              await activeTab.click(inputSelector);
              await activeTab.keyboard.type(messageText.trim(), { delay: 25 });
              await activeTab.keyboard.press('Enter');

              await crmRepository.markReplySent(outgoing.id);
              console.log(`[CrmService] Reply dispatched directly over CDP!`);
              return { success: true, message: 'Mensagem enviada com sucesso no Facebook!', outgoing_id: outgoing.id };
            }
          }
        } finally {
          await browser.close();
        }
      } catch (cdpErr: any) {
        console.warn(`[CrmService] CDP dispatch fallback: ${cdpErr.message}. Extension will dispatch via queue.`);
      }
    }

    return {
      success: true,
      message: 'Mensagem adicionada à fila de envio da extensão.',
      outgoing_id: outgoing.id,
    };
  }

  /**
   * Updates lead status, notes, phone, deal value, and location
   */
  async updateStatus(
    conversationId: number,
    leadStatus?: LeadStatus | string,
    notes?: string,
    customerPhone?: string,
    dealValue?: string,
    customerCity?: string,
    customerState?: string,
    customerAddress?: string,
    customerAssignedTo?: string
  ) {
    return crmRepository.updateConversationLead(conversationId, {
      lead_status: leadStatus,
      notes,
      customer_phone: customerPhone,
      deal_value: dealValue,
      customer_city: customerCity,
      customer_state: customerState,
      customer_address: customerAddress,
      customer_assigned_to: customerAssignedTo,
    });
  }

  // ==========================================
  // STATUSES PERSONALIZADOS
  // ==========================================

  async getStatuses() {
    return crmRepository.listStatuses();
  }

  async createStatus(data: any) {
    return crmRepository.createStatus(data);
  }

  async updateStatusConfig(id: number, data: any) {
    return crmRepository.updateStatus(id, data);
  }

  async deleteStatus(id: number) {
    return crmRepository.deleteStatus(id);
  }

  // ==========================================
  // TAGS PERSONALIZADAS
  // ==========================================

  async getTags() {
    return crmRepository.listTags();
  }

  async createTag(data: { name: string; color?: string }) {
    return crmRepository.createTag(data);
  }

  async deleteTag(id: number) {
    return crmRepository.deleteTag(id);
  }

  async addLeadTag(conversationId: number, tagId: number) {
    return crmRepository.addTagToLead(conversationId, tagId);
  }

  async removeLeadTag(conversationId: number, tagId: number) {
    return crmRepository.removeTagFromLead(conversationId, tagId);
  }

  async getLeadTags(conversationId: number) {
    return crmRepository.getLeadTags(conversationId);
  }

  // ==========================================
  // NOTAS INTERNAS
  // ==========================================

  async getLeadNotes(conversationId: number) {
    return crmRepository.getLeadNotes(conversationId);
  }

  async createLeadNote(conversationId: number, text: string, author = 'Atendente') {
    return crmRepository.createLeadNote(conversationId, text, author);
  }

  async deleteLeadNote(noteId: number) {
    return crmRepository.deleteLeadNote(noteId);
  }

  // ==========================================
  // FOLLOW-UPS E AGENDAMENTOS
  // ==========================================

  async getFollowups(filter?: any) {
    return crmRepository.listFollowups(filter);
  }

  async getLeadFollowups(conversationId: number) {
    return crmRepository.getLeadFollowups(conversationId);
  }

  async createFollowup(data: any) {
    return crmRepository.createFollowup(data);
  }

  async updateFollowup(id: number, data: any) {
    return crmRepository.updateFollowup(id, data);
  }

  async deleteFollowup(id: number) {
    return crmRepository.deleteFollowup(id);
  }

  // ==========================================
  // TIMELINE E EVENTOS
  // ==========================================

  async getLeadTimeline(conversationId: number, limit = 50) {
    return crmRepository.getLeadTimeline(conversationId, limit);
  }

  async recordEvent(conversationId: number, eventType: string, title: string, description?: string, metadata?: any) {
    return crmRepository.recordEvent(conversationId, eventType, title, description, metadata);
  }

  /**
   * Gets pending replies for extension polling
   */
  async getPendingReplies(profileId: number) {
    return crmRepository.getPendingReplies(profileId);
  }

  /**
   * Marks a reply as sent by extension
   */
  async markReplySent(outgoingId: number) {
    return crmRepository.markReplySent(outgoingId);
  }

  /**
   * Deletes a conversation and its messages
   */
  async deleteConversation(id: number) {
    return crmRepository.deleteConversation(id);
  }

  /**
   * Bulk updates lead status for multiple conversations
   */
  async bulkUpdateStatus(ids: number[], status: LeadStatus) {
    return crmRepository.bulkUpdateStatus(ids, status);
  }

  /**
   * Bulk deletes multiple conversations
   */
  async bulkDelete(ids: number[]) {
    return crmRepository.bulkDeleteConversations(ids);
  }

  /**
   * Saves parsed insights from Instagram
   */
  async saveInsights(data: CrmInsightData) {
    return crmRepository.saveInsights(data);
  }

  /**
   * Gets latest insights for a profile and timeframe
   */
  async getLatestInsights(profileId?: number, timeframe: number = 30) {
    return crmRepository.getLatestInsights(profileId, timeframe);
  }

  // ==========================================
  // COMANDAS / PEDIDOS DE VENDA
  // ==========================================

  async createOrder(data: CreateOrderInput): Promise<CrmOrder> {
    const order = await crmRepository.createOrder(data);

    // Se solicitado o envio no WhatsApp (ou se houver conversa associada com envio automático habilitado)
    if (data.send_whatsapp && data.conversation_id) {
      try {
        const now = new Date();
        const months = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        const dateStr = `${now.getDate().toString().padStart(2, '0')} / ${months[now.getMonth()]} / ${now.getFullYear()}`;
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        // Itens formatados
        const itemsStr = order.items && order.items.length > 0
          ? order.items.map(i => `${i.quantity}x ${i.product_name}${i.variant_name ? ` (${i.variant_name})` : ''} - R$: ${Number(i.unit_price).toFixed(2).replace('.', ',')}`).join('\n')
          : 'Produto diverso';

        // Forma de pagamento e parcelamento
        let paymentDesc = 'À vista no PIX';
        if (order.payment_method === 'cartao_parcelado' && order.installments > 1) {
          paymentDesc = `${order.installments}x de R$: ${Number(order.installment_amount).toFixed(2).replace('.', ',')}`;
        } else if (order.payment_method === 'cartao_vista') {
          paymentDesc = 'Cartão de Crédito/Débito à vista';
        } else if (order.payment_method === 'dinheiro') {
          paymentDesc = 'Dinheiro na entrega';
        }

        const receiptMessage =
`Data: ${dateStr}
Horário: ${timeStr}
Código da Venda: ${order.order_code}
Produto expedido por Snack Store BH - Eletronics e Smartwatch's
CNPJ: 32.404.968/0001-70 - Minas Gerais (Belo Horizonte)
Endereço :
Edifício Savannah Mall
R. Araguari, 359 - Barro Preto,
Belo Horizonte - MG, 30190-110
Segundo andar ( saindo do elevador saia à direita, final do corredor ) , sala 55

Nome do Cliente: ${order.customer_name}
CPF do Cliente: ${order.customer_cpf || 'Não informado'}
Email do Cliente: ${order.customer_email || 'Não informado'}
Telefone do Cliente: ${order.customer_phone || 'Não informado'}
Endereço : ${order.delivery_address || 'Não informado'}

Produto:
${itemsStr}
Valor Total do Produto: R$: ${Number(order.total_amount).toFixed(2).replace('.', ',')} (${paymentDesc})
Frete: R$: ${Number(order.shipping_fee).toFixed(2).replace('.', ',')} (Método: ${order.delivery_method.toUpperCase()})

—————————-

ESSA MENSAGEM TAMBÉM CONTA COMO COMPROVANTE DE COMPRA, POR FAVOR ARMAZENAR NO CELULAR PARA QUALQUER PROBLEMA
------------------------
 LEIA OS TERMOS DA NOSSA LOJA NO INSTAGRAM ( @SNACKSTOREBH )*`;

        // Despachar no chat do WhatsApp da conversa ativa
        await this.sendReply(data.conversation_id, receiptMessage);
      } catch (err: any) {
        console.error('[CrmService] Falha ao enviar comprovante no WhatsApp:', err.message);
      }
    }

    return order;
  }

  async listOrders(filter: {
    conversation_id?: number;
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    return crmRepository.listOrders(filter);
  }

  async getOrderById(id: number) {
    return crmRepository.getOrderById(id);
  }

  async deleteOrder(id: number) {
    return crmRepository.deleteOrder(id);
  }
}

export const crmService = new CrmService();


