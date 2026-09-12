import { pool } from '../db/index.js';
import { CrmConversation, CrmMessage, CrmOutgoingMessage, LeadStatus, CrmPlatform } from '../types/index.js';

export class CrmRepository {
  /**
   * Upserts a conversation from webhook data
   */
  async upsertConversation(data: {
    profile_id?: number | null;
    platform: CrmPlatform;
    external_id: string;
    customer_name: string;
    customer_avatar?: string | null;
    product_title?: string | null;
    product_price?: string | null;
    product_image?: string | null;
    product_url?: string | null;
    last_message?: string | null;
    last_message_at?: Date | string | null;
    unread_count?: number;
  }): Promise<CrmConversation> {
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO crm_conversations (
          profile_id, platform, external_id, customer_name, customer_avatar,
          product_title, product_price, product_image, product_url,
          last_message, last_message_at, unread_count, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, NOW()), COALESCE($12, 0), NOW()
        )
        ON CONFLICT (platform, external_id, profile_id)
        DO UPDATE SET
          customer_name = EXCLUDED.customer_name,
          customer_avatar = COALESCE(EXCLUDED.customer_avatar, crm_conversations.customer_avatar),
          product_title = COALESCE(EXCLUDED.product_title, crm_conversations.product_title),
          product_price = COALESCE(EXCLUDED.product_price, crm_conversations.product_price),
          product_image = COALESCE(EXCLUDED.product_image, crm_conversations.product_image),
          product_url = COALESCE(EXCLUDED.product_url, crm_conversations.product_url),
          last_message = COALESCE(EXCLUDED.last_message, crm_conversations.last_message),
          last_message_at = COALESCE(EXCLUDED.last_message_at, crm_conversations.last_message_at),
          unread_count = CASE WHEN EXCLUDED.unread_count > 0 THEN EXCLUDED.unread_count ELSE crm_conversations.unread_count END,
          updated_at = NOW()
        RETURNING *;
      `;

      const values = [
        data.profile_id || null,
        data.platform,
        data.external_id,
        data.customer_name || 'Cliente',
        data.customer_avatar || null,
        data.product_title || null,
        data.product_price || null,
        data.product_image || null,
        data.product_url || null,
        data.last_message || null,
        data.last_message_at || null,
        data.unread_count || 0,
      ];

      const res = await client.query(query, values);
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Saves incoming messages if not already present
   */
  async saveMessage(data: {
    conversation_id: number;
    sender_type: 'customer' | 'me';
    sender_name?: string | null;
    content: string;
    external_id?: string | null;
    sent_at?: Date | string | null;
  }): Promise<CrmMessage> {
    const client = await pool.connect();
    try {
      // Avoid inserting exact duplicate message if same content sent within recent window
      const checkQuery = `
        SELECT id FROM crm_messages
        WHERE conversation_id = $1 AND content = $2 AND sender_type = $3
        ORDER BY id DESC LIMIT 1;
      `;
      const existing = await client.query(checkQuery, [data.conversation_id, data.content, data.sender_type]);
      if (existing.rows.length > 0) {
        return existing.rows[0] as CrmMessage;
      }

      const insertQuery = `
        INSERT INTO crm_messages (
          conversation_id, sender_type, sender_name, content, external_id, sent_at
        ) VALUES (
          $1, $2, $3, $4, $5, COALESCE($6, NOW())
        )
        RETURNING *;
      `;
      const res = await client.query(insertQuery, [
        data.conversation_id,
        data.sender_type,
        data.sender_name || null,
        data.content,
        data.external_id || null,
        data.sent_at || null,
      ]);
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Lists conversations with filters and profile name
   */
  async listConversations(filter: {
    profile_id?: number;
    platform?: CrmPlatform;
    lead_status?: LeadStatus;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<CrmConversation[]> {
    const client = await pool.connect();
    try {
      let query = `
        SELECT c.*, p.name AS profile_name
        FROM crm_conversations c
        LEFT JOIN profiles p ON p.id = c.profile_id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filter.profile_id) {
        params.push(filter.profile_id);
        query += ` AND c.profile_id = $${params.length}`;
      }

      if (filter.platform) {
        params.push(filter.platform);
        query += ` AND c.platform = $${params.length}`;
      }

      if (filter.lead_status) {
        params.push(filter.lead_status);
        query += ` AND c.lead_status = $${params.length}`;
      }

      if (filter.search) {
        params.push(`%${filter.search}%`);
        query += ` AND (c.customer_name ILIKE $${params.length} OR c.product_title ILIKE $${params.length} OR c.last_message ILIKE $${params.length})`;
      }

      query += ` ORDER BY c.updated_at DESC`;

      const limit = filter.limit || 50;
      params.push(limit);
      query += ` LIMIT $${params.length}`;

      const offset = filter.offset || 0;
      params.push(offset);
      query += ` OFFSET $${params.length}`;

      const res = await client.query(query, params);
      return res.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Gets conversation by ID
   */
  async getConversationById(id: number): Promise<CrmConversation | null> {
    const client = await pool.connect();
    try {
      const query = `
        SELECT c.*, p.name AS profile_name
        FROM crm_conversations c
        LEFT JOIN profiles p ON p.id = c.profile_id
        WHERE c.id = $1;
      `;
      const res = await client.query(query, [id]);
      return res.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * Gets messages for a conversation
   */
  async getMessagesByConversationId(conversationId: number, limit = 50): Promise<CrmMessage[]> {
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM crm_messages
        WHERE conversation_id = $1
        ORDER BY sent_at ASC, id ASC
        LIMIT $2;
      `;
      const res = await client.query(query, [conversationId, limit]);
      return res.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Updates lead status or notes
   */
  async updateConversationLead(id: number, data: { lead_status?: LeadStatus; notes?: string; unread_count?: number }): Promise<CrmConversation | null> {
    const client = await pool.connect();
    try {
      const updates: string[] = ['updated_at = NOW()'];
      const params: any[] = [id];

      if (data.lead_status !== undefined) {
        params.push(data.lead_status);
        updates.push(`lead_status = $${params.length}`);
      }

      if (data.notes !== undefined) {
        params.push(data.notes);
        updates.push(`notes = $${params.length}`);
      }

      if (data.unread_count !== undefined) {
        params.push(data.unread_count);
        updates.push(`unread_count = $${params.length}`);
      }

      const query = `
        UPDATE crm_conversations
        SET ${updates.join(', ')}
        WHERE id = $1
        RETURNING *;
      `;
      const res = await client.query(query, params);
      return res.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * Enqueues an outgoing reply from the dashboard
   */
  async enqueueReply(data: {
    conversation_id: number;
    profile_id: number;
    platform: CrmPlatform;
    external_id: string;
    message_text: string;
  }): Promise<CrmOutgoingMessage> {
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO crm_outgoing_queue (
          conversation_id, profile_id, platform, external_id, message_text, status
        ) VALUES (
          $1, $2, $3, $4, $5, 'pending'
        )
        RETURNING *;
      `;
      const res = await client.query(query, [
        data.conversation_id,
        data.profile_id,
        data.platform,
        data.external_id,
        data.message_text,
      ]);
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Gets pending replies for a profile
   */
  async getPendingReplies(profileId: number): Promise<CrmOutgoingMessage[]> {
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM crm_outgoing_queue
        WHERE profile_id = $1 AND status = 'pending'
        ORDER BY id ASC
        LIMIT 10;
      `;
      const res = await client.query(query, [profileId]);
      return res.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Marks reply as sent
   */
  async markReplySent(id: number): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE crm_outgoing_queue SET status = 'sent', sent_at = NOW() WHERE id = $1;`,
        [id]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Marks reply as failed
   */
  async markReplyFailed(id: number, error: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE crm_outgoing_queue SET status = 'failed', error_message = $2, attempts = attempts + 1 WHERE id = $1;`,
        [id, error]
      );
    } finally {
      client.release();
    }
  }
}

export const crmRepository = new CrmRepository();
