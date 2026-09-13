import { crmRepository } from '../repositories/crm.repository.js';

export interface EvolutionConfig {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
  instanceToken: string;
}

export class EvolutionService {
  private config: EvolutionConfig;

  constructor() {
    this.config = {
      baseUrl: (process.env.EVOLUTION_API_URL || 'https://plug-sales-dispatch-app-evolution-api.hx8235.easypanel.host').replace(/\/$/, ''),
      apiKey: process.env.EVOLUTION_API_KEY || '429683C4C977415CAAFCCE10F7D57E11',
      instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'notification_snackstore',
      instanceToken: process.env.EVOLUTION_INSTANCE_TOKEN || '71CADA2D817B-413C-93BA-2FFAAD2852BB',
    };
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      apikey: this.config.apiKey,
    };
  }

  /**
   * Buscar lista de conversas da instância no WhatsApp
   */
  async fetchChats(): Promise<any[]> {
    const url = `${this.config.baseUrl}/chat/findChats/${this.config.instanceName}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[Evolution] Erro ao buscar conversas (${response.status}):`, errText);
        return [];
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.error('[Evolution] Exceção ao buscar conversas:', err.message);
      return [];
    }
  }

  /**
   * Buscar mensagens de um chat específico (remoteJid)
   */
  async fetchMessages(remoteJid: string, limit: number = 30): Promise<any[]> {
    const url = `${this.config.baseUrl}/chat/findMessages/${this.config.instanceName}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          where: {
            key: {
              remoteJid: remoteJid,
            },
          },
        }),
      });

      if (!response.ok) {
        return [];
      }

      const data: any = await response.json();
      if (data && data.messages && Array.isArray(data.messages.records)) {
        return data.messages.records;
      }
      if (Array.isArray(data)) return data;
      return [];
    } catch (err: any) {
      console.error(`[Evolution] Erro ao buscar mensagens de ${remoteJid}:`, err.message);
      return [];
    }
  }

  /**
   * Enviar mensagem de texto via WhatsApp (Evolution API)
   */
  async sendTextMessage(numberOrJid: string, text: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const url = `${this.config.baseUrl}/message/sendText/${this.config.instanceName}`;

    // Se já tiver JID com @ (ex: @lid, @s.whatsapp.net, @g.us), preserva integralmente.
    // Se for apenas número com formatação (+55 11 9999-9999), limpa para apenas dígitos.
    let recipient = (numberOrJid || '').trim();
    if (!recipient.includes('@')) {
      recipient = recipient.replace(/\D/g, '');
    }

    if (!recipient) {
      return { success: false, error: 'Destinatário/Número inválido' };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          number: recipient,
          text: text,
          delay: 1000,
        }),
      });

      const resData: any = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error('[Evolution] Erro no envio:', resData);
        let errorMsg = 'Falha no envio WhatsApp';
        if (typeof resData?.response?.message === 'string') {
          errorMsg = resData.response.message;
        } else if (Array.isArray(resData?.response?.message)) {
          errorMsg = resData.response.message.map((m: any) => m.message || m.jid || JSON.stringify(m)).join(', ');
        } else if (resData?.message) {
          errorMsg = typeof resData.message === 'string' ? resData.message : JSON.stringify(resData.message);
        } else if (resData?.error) {
          errorMsg = typeof resData.error === 'string' ? resData.error : JSON.stringify(resData.error);
        }
        return { success: false, error: errorMsg };
      }

      return { success: true, data: resData };
    } catch (err: any) {
      console.error('[Evolution] Falha ao enviar mensagem:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Sincronizar todos os chats ativos do WhatsApp para a base CRM
   */
  async syncWhatsAppChats(): Promise<{ count: number; updated: number }> {
    console.log('[Evolution] Iniciando sincronização de chats do WhatsApp...');
    const chats = await this.fetchChats();
    let count = 0;
    let updated = 0;

    for (const chat of chats) {
      try {
        const remoteJid = chat.remoteJid || chat.id;
        if (!remoteJid) continue;

        // Ignorar status do WhatsApp (@broadcast)
        if (remoteJid.includes('status@broadcast')) continue;

        // Extrair telefone
        const phone = remoteJid.replace(/@.*$/, '').replace(/\D/g, '');

        // Extrair nome
        let customerName = chat.pushName || '';
        if (!customerName || customerName === 'Você' || customerName === phone) {
          customerName = phone ? `WhatsApp (${phone})` : 'Contato WhatsApp';
        }

        const avatar = chat.profilePicUrl || null;

        // Extrair última mensagem
        let lastMessageText = '';
        let lastMessageDate = new Date();

        if (chat.lastMessage) {
          const lm = chat.lastMessage;
          const msgObj = lm.message || {};
          lastMessageText =
            msgObj.conversation ||
            msgObj.extendedTextMessage?.text ||
            msgObj.imageMessage?.caption ||
            msgObj.buttonsResponseMessage?.selectedDisplayText ||
            (lm.messageType ? `[${lm.messageType}]` : 'Mensagem recebida');

          if (lm.messageTimestamp) {
            const ts = typeof lm.messageTimestamp === 'number' ? lm.messageTimestamp : parseInt(lm.messageTimestamp, 10);
            if (ts > 0) {
              lastMessageDate = new Date(ts > 100000000000 ? ts : ts * 1000);
            }
          }
        }

        // Upsert na tabela de conversas do CRM
        const conv = await crmRepository.upsertConversation({
          profile_id: 1, // Perfil padrão
          platform: 'whatsapp',
          external_id: remoteJid,
          customer_name: customerName,
          customer_avatar: avatar,
          last_message: lastMessageText,
          last_message_at: lastMessageDate,
          unread_count: chat.unreadCount || 0,
        });

        if (conv) {
          count++;

          // Atualizar o telefone cadastrado do lead caso esteja vazio
          if (phone) {
            await crmRepository.updateConversationLead(conv.id, {
              customer_phone: phone,
            });
          }

          // Se a última mensagem existe, garantir registro em crm_messages
          if (lastMessageText && chat.lastMessage) {
            const isMe = Boolean(chat.lastMessage.key?.fromMe);
            await crmRepository.saveMessage({
              conversation_id: conv.id,
              sender_type: isMe ? 'me' : 'customer',
              sender_name: isMe ? 'Atendente' : customerName,
              content: lastMessageText,
              sent_at: lastMessageDate,
              external_id: chat.lastMessage.key?.id,
            });
            updated++;
          }
        }
      } catch (err: any) {
        console.warn('[Evolution] Erro ao sincronizar chat individual:', err.message);
      }
    }

    console.log(`[Evolution] Sincronização concluída: ${count} conversas mapeadas, ${updated} atualizadas.`);
    return { count, updated };
  }

  /**
   * Processa Webhook recebido da Evolution API em tempo real
   */
  async handleWebhook(payload: any): Promise<{ handled: boolean; reason?: string }> {
    if (!payload) return { handled: false, reason: 'Payload vazio' };

    const event = payload.event || payload.type;
    const data = payload.data || payload;

    // Monitorar eventos de mensagens recebidas ou enviadas
    if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT' || payload.message) {
      const msgRecord = data.message || (Array.isArray(data.messages) ? data.messages[0] : data);
      if (!msgRecord || !msgRecord.key) {
        return { handled: false, reason: 'Registro de mensagem inválido' };
      }

      const remoteJid = msgRecord.key.remoteJid;
      if (!remoteJid || remoteJid.includes('status@broadcast')) {
        return { handled: false, reason: 'JID de broadcast ignorado' };
      }

      const isMe = Boolean(msgRecord.key.fromMe);
      const pushName = msgRecord.pushName || data.pushName;
      const phone = remoteJid.replace(/@.*$/, '').replace(/\D/g, '');
      const customerName = pushName || `WhatsApp (${phone})`;

      const msgObj = msgRecord.message || {};
      const messageText =
        msgObj.conversation ||
        msgObj.extendedTextMessage?.text ||
        msgObj.imageMessage?.caption ||
        msgObj.buttonsResponseMessage?.selectedDisplayText ||
        (msgRecord.messageType ? `[${msgRecord.messageType}]` : 'Mensagem recebida');

      let sentAt = new Date();
      if (msgRecord.messageTimestamp) {
        const ts = typeof msgRecord.messageTimestamp === 'number' ? msgRecord.messageTimestamp : parseInt(msgRecord.messageTimestamp, 10);
        if (ts > 0) {
          sentAt = new Date(ts > 100000000000 ? ts : ts * 1000);
        }
      }

      const conv = await crmRepository.upsertConversation({
        profile_id: 1,
        platform: 'whatsapp',
        external_id: remoteJid,
        customer_name: customerName,
        last_message: messageText,
        last_message_at: sentAt,
        unread_count: isMe ? 0 : 1,
      });

      if (conv) {
        if (phone) {
          await crmRepository.updateConversationLead(conv.id, {
            customer_phone: phone,
          });
        }

        await crmRepository.saveMessage({
          conversation_id: conv.id,
          sender_type: isMe ? 'me' : 'customer',
          sender_name: isMe ? 'Atendente' : customerName,
          content: messageText,
          sent_at: sentAt,
          external_id: msgRecord.key.id,
        });

        return { handled: true };
      }
    }

    return { handled: false, reason: `Evento ${event} não acionou ação de mensagem` };
  }
}

export const evolutionService = new EvolutionService();
