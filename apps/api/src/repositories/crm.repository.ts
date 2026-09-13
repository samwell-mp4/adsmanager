import { pool } from '../db/index.js';
import { CrmConversation, CrmMessage, CrmOutgoingMessage, LeadStatus, CrmPlatform } from '../types/index.js';

let tablesInitialized = false;

export class CrmRepository {
  /**
   * Automatically ensures all CRM tables and indexes exist in the database
   */
  async ensureCrmTablesExist(): Promise<void> {
    if (tablesInitialized) return;
    const client = await pool.connect();
    try {
      await client.query(`
        -- Tabela de conversas / leads do CRM
        CREATE TABLE IF NOT EXISTS crm_conversations (
            id SERIAL PRIMARY KEY,
            profile_id INTEGER DEFAULT 0,
            platform VARCHAR(50) NOT NULL DEFAULT 'facebook',
            external_id VARCHAR(255) NOT NULL,
            customer_name VARCHAR(255) NOT NULL DEFAULT 'Cliente',
            customer_avatar TEXT,
            product_title TEXT,
            product_price VARCHAR(100),
            product_image TEXT,
            product_url TEXT,
            last_message TEXT,
            last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            unread_count INTEGER NOT NULL DEFAULT 0,
            lead_status VARCHAR(50) NOT NULL DEFAULT 'novo',
            notes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Tabela de mensagens individuais de cada conversa
        CREATE TABLE IF NOT EXISTS crm_messages (
            id SERIAL PRIMARY KEY,
            conversation_id INTEGER NOT NULL REFERENCES crm_conversations(id) ON DELETE CASCADE,
            sender_type VARCHAR(20) NOT NULL DEFAULT 'customer',
            sender_name VARCHAR(255),
            content TEXT NOT NULL,
            external_id VARCHAR(255),
            sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Fila de respostas a serem enviadas pela extensão ou CDP
        CREATE TABLE IF NOT EXISTS crm_outgoing_queue (
            id SERIAL PRIMARY KEY,
            conversation_id INTEGER NOT NULL REFERENCES crm_conversations(id) ON DELETE CASCADE,
            profile_id INTEGER DEFAULT 0,
            platform VARCHAR(50) NOT NULL,
            external_id VARCHAR(255) NOT NULL,
            message_text TEXT NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            attempts INTEGER NOT NULL DEFAULT 0,
            error_message TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            sent_at TIMESTAMPTZ
        );

        -- Unique index supporting profile_id safely
        CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_conv_plat_ext_prof
        ON crm_conversations (platform, external_id, profile_id);

        -- Índices de performance
        CREATE INDEX IF NOT EXISTS idx_crm_conv_platform ON crm_conversations(platform);
        CREATE INDEX IF NOT EXISTS idx_crm_conv_profile ON crm_conversations(profile_id);
        CREATE INDEX IF NOT EXISTS idx_crm_conv_updated ON crm_conversations(updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_crm_msg_conv ON crm_messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_crm_queue_status ON crm_outgoing_queue(status, profile_id);
      `);

      // Migração e Limpeza de Clientes Duplicados:
      // 1. Remover índice antigo que permitia duplicação com profile_id diferente
      await client.query(`DROP INDEX IF EXISTS uq_crm_conv_plat_ext_prof;`);

      // 2. Limpar mensagens de sistema/lixo do Facebook
      await client.query(`
        DELETE FROM crm_conversations 
        WHERE customer_name ILIKE '%Parece que publicaste este anúncio%'
           OR customer_name ILIKE '%Pedido de mensagem%'
           OR customer_name ILIKE '%Ativo agora%';
      `);

      // 3. Mesclar e unificar conversas duplicadas por (platform, external_id)
      const extDups = await client.query(`
        SELECT platform, external_id, ARRAY_AGG(id ORDER BY (product_title IS NOT NULL) DESC, (customer_name NOT IN ('Cliente', 'Cliente Facebook', 'Cliente Atual', 'Pedido de mensagem')) DESC, updated_at DESC, id DESC) as ids
        FROM crm_conversations
        GROUP BY platform, external_id
        HAVING COUNT(*) > 1
      `);
      for (const row of extDups.rows) {
        const ids: number[] = row.ids;
        const primaryId = ids[0];
        const dupIds = ids.slice(1);
        for (const dupId of dupIds) {
          await client.query(`UPDATE crm_messages SET conversation_id = $1 WHERE conversation_id = $2`, [primaryId, dupId]);
          await client.query(`UPDATE crm_outgoing_queue SET conversation_id = $1 WHERE conversation_id = $2`, [primaryId, dupId]);
          await client.query(`DELETE FROM crm_conversations WHERE id = $1`, [dupId]);
        }
      }

      // 4. Mesclar conversas duplicadas pelo mesmo nome de cliente na mesma plataforma
      const nameDups = await client.query(`
        SELECT platform, LOWER(TRIM(customer_name)) as norm_name, ARRAY_AGG(id ORDER BY (product_title IS NOT NULL) DESC, updated_at DESC, id DESC) as ids
        FROM crm_conversations
        WHERE LOWER(TRIM(customer_name)) NOT IN ('cliente', 'cliente facebook', 'cliente atual', 'pedido de mensagem', 'ativo agora', '')
          AND LENGTH(TRIM(customer_name)) >= 3
        GROUP BY platform, LOWER(TRIM(customer_name))
        HAVING COUNT(*) > 1
      `);
      for (const row of nameDups.rows) {
        const ids: number[] = row.ids;
        const primaryId = ids[0];
        const dupIds = ids.slice(1);
        for (const dupId of dupIds) {
          await client.query(`
            UPDATE crm_conversations
            SET
              product_title = COALESCE(crm_conversations.product_title, (SELECT product_title FROM crm_conversations WHERE id = $2)),
              product_price = COALESCE(crm_conversations.product_price, (SELECT product_price FROM crm_conversations WHERE id = $2)),
              product_image = COALESCE(crm_conversations.product_image, (SELECT product_image FROM crm_conversations WHERE id = $2)),
              customer_avatar = COALESCE(crm_conversations.customer_avatar, (SELECT customer_avatar FROM crm_conversations WHERE id = $2))
            WHERE id = $1
          `, [primaryId, dupId]);

          await client.query(`UPDATE crm_messages SET conversation_id = $1 WHERE conversation_id = $2`, [primaryId, dupId]);
          await client.query(`UPDATE crm_outgoing_queue SET conversation_id = $1 WHERE conversation_id = $2`, [primaryId, dupId]);
          await client.query(`DELETE FROM crm_conversations WHERE id = $1`, [dupId]);
        }
      }

      // 5. Criar índice único absoluto por (platform, external_id)
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_conv_plat_ext
        ON crm_conversations (platform, external_id);
      `);

      tablesInitialized = true;
      console.log('[CrmRepository] CRM database tables, unique constraints, and deduplication verified.');
    } catch (err: any) {
      console.error('[CrmRepository] Error verifying CRM tables:', err.message);
      throw err;
    } finally {
      client.release();
    }
  }

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
    await this.ensureCrmTablesExist();
    const client = await pool.connect();
    try {
      const cleanName = (data.customer_name || '').trim();
      const isGenericName = !cleanName || ['cliente', 'cliente facebook', 'cliente atual', 'pedido de mensagem', 'ativo agora'].includes(cleanName.toLowerCase());

      // 1. Se for um cliente com nome específico real, verificar se já existe conversa com ele nesta plataforma
      if (!isGenericName && cleanName.length >= 3) {
        const matchRes = await client.query(`
          SELECT id, external_id, customer_name, product_title FROM crm_conversations 
          WHERE platform = $1 
            AND LOWER(TRIM(customer_name)) = LOWER(TRIM($2))
            AND (
              $3::TEXT IS NULL 
              OR product_title IS NULL 
              OR LOWER(TRIM(product_title)) = LOWER(TRIM($3))
            )
          ORDER BY (external_id = $4) DESC, (product_title IS NOT NULL) DESC, updated_at DESC
          LIMIT 1
        `, [data.platform, cleanName, data.product_title || null, data.external_id]);

        if (matchRes.rows.length > 0) {
          const existing = matchRes.rows[0];
          const updateRes = await client.query(`
            UPDATE crm_conversations SET
              profile_id = CASE WHEN $1 > 0 THEN $1 ELSE profile_id END,
              external_id = COALESCE($2, external_id),
              customer_name = $3,
              customer_avatar = COALESCE($4, customer_avatar),
              product_title = COALESCE(crm_conversations.product_title, $5),
              product_price = COALESCE(crm_conversations.product_price, $6),
              product_image = COALESCE(crm_conversations.product_image, $7),
              product_url = COALESCE(crm_conversations.product_url, $8),
              last_message = COALESCE($9, last_message),
              last_message_at = COALESCE($10, last_message_at),
              unread_count = CASE WHEN $11 > 0 THEN $11 ELSE unread_count END,
              updated_at = NOW()
            WHERE id = $12
            RETURNING *;
          `, [
            data.profile_id || 0,
            data.external_id,
            cleanName,
            data.customer_avatar || null,
            data.product_title || null,
            data.product_price || null,
            data.product_image || null,
            data.product_url || null,
            data.last_message || null,
            data.last_message_at || null,
            data.unread_count || 0,
            existing.id
          ]);
          return updateRes.rows[0];
        }
      }

      // 2. Upsert unificado e único por (platform, external_id)
      const query = `
        INSERT INTO crm_conversations (
          profile_id, platform, external_id, customer_name, customer_avatar,
          product_title, product_price, product_image, product_url,
          last_message, last_message_at, unread_count, updated_at
        ) VALUES (
          COALESCE($1, 0), $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, NOW()), COALESCE($12, 0), NOW()
        )
        ON CONFLICT (platform, external_id)
        DO UPDATE SET
          profile_id = CASE WHEN EXCLUDED.profile_id > 0 THEN EXCLUDED.profile_id ELSE crm_conversations.profile_id END,
          customer_name = CASE 
            WHEN EXCLUDED.customer_name NOT IN ('Cliente', 'Cliente Facebook', 'Cliente Atual', 'Pedido de mensagem', 'Ativo agora') 
            THEN EXCLUDED.customer_name 
            ELSE crm_conversations.customer_name 
          END,
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
        data.profile_id || 0,
        data.platform,
        data.external_id,
        cleanName || 'Cliente',
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
    marketplace_only?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<CrmConversation[]> {
    await this.ensureCrmTablesExist();
    const client = await pool.connect();
    try {
      let query = `
        SELECT c.*, p.name AS profile_name
        FROM crm_conversations c
        LEFT JOIN browser_profiles p ON p.id = c.profile_id
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

      if (filter.marketplace_only) {
        query += ` AND (c.product_title IS NOT NULL OR c.product_price IS NOT NULL OR c.product_url IS NOT NULL OR c.platform = 'olx')`;
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
    await this.ensureCrmTablesExist();
    const client = await pool.connect();
    try {
      const query = `
        SELECT c.*, p.name AS profile_name
        FROM crm_conversations c
        LEFT JOIN browser_profiles p ON p.id = c.profile_id
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

  /**
   * Deletes a conversation and all cascaded messages
   */
  async deleteConversation(id: number): Promise<boolean> {
    const client = await pool.connect();
    try {
      const res = await client.query(`DELETE FROM crm_conversations WHERE id = $1 RETURNING id;`, [id]);
      return (res.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }
}

export const crmRepository = new CrmRepository();
