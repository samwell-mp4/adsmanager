import { crmRepository } from '../repositories/crm.repository.js';
import { profileRepository } from '../repositories/profile.repository.js';
import { dockerManager } from '../managers/docker.manager.js';
import { CrmConversation, CrmMessage, CrmOutgoingMessage, CrmWebhookPayload, LeadStatus, CrmPlatform } from '../types/index.js';

export class CrmService {
  /**
   * Ingests webhook data sent from the Chrome Extension
   */
  async processWebhook(payload: CrmWebhookPayload): Promise<{ success: boolean; synced_conversations: number; synced_messages: number }> {
    let profileId = payload.profile_id || null;

    if (!profileId && payload.profile_uuid) {
      const profile = await profileRepository.findByUuid(payload.profile_uuid);
      if (profile) profileId = profile.id;
    }

    let syncedConvs = 0;
    let syncedMsgs = 0;

    if (!payload.conversations || !Array.isArray(payload.conversations)) {
      return { success: true, synced_conversations: 0, synced_messages: 0 };
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
    return { success: true, synced_conversations: syncedConvs, synced_messages: syncedMsgs };
  }

  /**
   * Lists unified conversations
   */
  async listConversations(filter: {
    profile_id?: number;
    platform?: CrmPlatform;
    lead_status?: LeadStatus;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    return crmRepository.listConversations(filter);
  }

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

    const messages = await crmRepository.getMessagesByConversationId(id, 100);
    return {
      conversation,
      messages,
    };
  }

  /**
   * Sends a reply from the operator dashboard to the customer via extension or CDP
   */
  async sendReply(conversationId: number, messageText: string): Promise<{ success: boolean; message: string; outgoing_id?: number }> {
    const conversation = await crmRepository.getConversationById(conversationId);
    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }

    if (!conversation.profile_id) {
      throw new Error('Perfil de navegador associado não encontrado');
    }

    // 1. Immediately save our reply in the CRM messages database
    await crmRepository.saveMessage({
      conversation_id: conversation.id,
      sender_type: 'me',
      sender_name: 'Atendente',
      content: messageText.trim(),
      sent_at: new Date(),
    });

    // 2. Update conversation last_message
    await crmRepository.upsertConversation({
      profile_id: conversation.profile_id,
      platform: conversation.platform,
      external_id: conversation.external_id,
      customer_name: conversation.customer_name,
      last_message: messageText.trim(),
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
   * Updates lead status
   */
  async updateStatus(conversationId: number, leadStatus: LeadStatus, notes?: string) {
    return crmRepository.updateConversationLead(conversationId, { lead_status: leadStatus, notes });
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
}

export const crmService = new CrmService();
