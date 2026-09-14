import { pool } from '../db/index.js';
import {
  CrmConversation,
  CrmMessage,
  CrmOutgoingMessage,
  LeadStatus,
  CrmPlatform,
  CrmInsightData,
  CrmCustomStatus,
  CrmTag,
  CrmNote,
  CrmFollowup,
  CrmEvent,
  CrmOrder,
  CrmOrderItem,
  CreateOrderInput,
  CrmFinancialTransaction,
  CreateFinancialTransactionInput,
  FinancialSummary
} from '../types/index.js';

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

        -- Tabela de Blacklist para conversas excluídas pelo usuário
        CREATE TABLE IF NOT EXISTS crm_deleted_conversations (
            id SERIAL PRIMARY KEY,
            platform VARCHAR(50) NOT NULL,
            external_id VARCHAR(255) NOT NULL,
            deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (platform, external_id)
        );

        -- Tabela de Insights e Métricas Oficiais (Instagram / Meta)
        CREATE TABLE IF NOT EXISTS crm_insights (
            id SERIAL PRIMARY KEY,
            profile_id INTEGER DEFAULT 0,
            platform VARCHAR(50) DEFAULT 'instagram',
            timeframe INTEGER DEFAULT 30,
            views INTEGER DEFAULT 0,
            viewers INTEGER DEFAULT 0,
            followers_views_pct NUMERIC(5, 2) DEFAULT 0,
            non_followers_views_pct NUMERIC(5, 2) DEFAULT 0,
            stories_views_pct NUMERIC(5, 2) DEFAULT 0,
            posts_views_pct NUMERIC(5, 2) DEFAULT 0,
            reels_views_pct NUMERIC(5, 2) DEFAULT 0,
            interactions INTEGER DEFAULT 0,
            followers_interactions_pct NUMERIC(5, 2) DEFAULT 0,
            non_followers_interactions_pct NUMERIC(5, 2) DEFAULT 0,
            accounts_engaged INTEGER DEFAULT 0,
            stories_interactions_pct NUMERIC(5, 2) DEFAULT 0,
            posts_interactions_pct NUMERIC(5, 2) DEFAULT 0,
            reels_interactions_pct NUMERIC(5, 2) DEFAULT 0,
            profile_activity INTEGER DEFAULT 0,
            profile_visits INTEGER DEFAULT 0,
            external_link_taps INTEGER DEFAULT 0,
            total_followers INTEGER DEFAULT 0,
            active_times JSONB DEFAULT '[]'::jsonb,
            top_content_views JSONB DEFAULT '[]'::jsonb,
            top_content_interactions JSONB DEFAULT '[]'::jsonb,
            raw_data JSONB DEFAULT '{}'::jsonb,
            synced_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Tabela de Status Personalizados do CRM
        CREATE TABLE IF NOT EXISTS crm_statuses (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            slug VARCHAR(100) NOT NULL UNIQUE,
            color VARCHAR(50) NOT NULL DEFAULT '#64748B',
            icon VARCHAR(50) DEFAULT 'bookmark',
            position INTEGER NOT NULL DEFAULT 0,
            is_initial BOOLEAN NOT NULL DEFAULT FALSE,
            is_won BOOLEAN NOT NULL DEFAULT FALSE,
            is_lost BOOLEAN NOT NULL DEFAULT FALSE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Tabela de Tags Personalizadas do CRM
        CREATE TABLE IF NOT EXISTS crm_tags (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            slug VARCHAR(100) NOT NULL,
            color VARCHAR(50) NOT NULL DEFAULT '#3B82F6',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Tabela N:N de Tags por Lead/Conversa
        CREATE TABLE IF NOT EXISTS crm_lead_tags (
            id SERIAL PRIMARY KEY,
            conversation_id INTEGER NOT NULL REFERENCES crm_conversations(id) ON DELETE CASCADE,
            tag_id INTEGER NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (conversation_id, tag_id)
        );

        -- Tabela de Notas Internas da Equipe por Lead
        CREATE TABLE IF NOT EXISTS crm_notes (
            id SERIAL PRIMARY KEY,
            conversation_id INTEGER NOT NULL REFERENCES crm_conversations(id) ON DELETE CASCADE,
            author_name VARCHAR(100) NOT NULL DEFAULT 'Atendente',
            note_text TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Tabela de Follow-ups e Agendamentos de Tarefas
        CREATE TABLE IF NOT EXISTS crm_followups (
            id SERIAL PRIMARY KEY,
            conversation_id INTEGER NOT NULL REFERENCES crm_conversations(id) ON DELETE CASCADE,
            profile_id INTEGER DEFAULT 0,
            scheduled_at TIMESTAMPTZ NOT NULL,
            followup_type VARCHAR(50) NOT NULL DEFAULT 'WhatsApp',
            priority VARCHAR(20) NOT NULL DEFAULT 'normal',
            notes TEXT,
            assignee VARCHAR(100) DEFAULT 'Operador',
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            completed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Tabela de Eventos Estruturados / Timeline do Cliente
        CREATE TABLE IF NOT EXISTS crm_events (
            id SERIAL PRIMARY KEY,
            conversation_id INTEGER NOT NULL REFERENCES crm_conversations(id) ON DELETE CASCADE,
            event_type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Campos adicionais para negociação e agilidade
        ALTER TABLE crm_conversations ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
        ALTER TABLE crm_conversations ADD COLUMN IF NOT EXISTS deal_value VARCHAR(50);
        ALTER TABLE crm_conversations ADD COLUMN IF NOT EXISTS customer_city VARCHAR(100);
        ALTER TABLE crm_conversations ADD COLUMN IF NOT EXISTS customer_state VARCHAR(10);
        ALTER TABLE crm_conversations ADD COLUMN IF NOT EXISTS customer_address TEXT;
        ALTER TABLE crm_conversations ADD COLUMN IF NOT EXISTS customer_assigned_to VARCHAR(100);

        -- Índices de performance e operacionais
        CREATE INDEX IF NOT EXISTS idx_crm_conv_platform ON crm_conversations(platform);
        CREATE INDEX IF NOT EXISTS idx_crm_conv_profile ON crm_conversations(profile_id);
        CREATE INDEX IF NOT EXISTS idx_crm_conv_lastmsg ON crm_conversations(last_message_at DESC);
        CREATE INDEX IF NOT EXISTS idx_crm_conv_updated ON crm_conversations(updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_crm_msg_conv ON crm_messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_crm_queue_status ON crm_outgoing_queue(status, profile_id);
        CREATE INDEX IF NOT EXISTS idx_crm_insights_prof_tf ON crm_insights(platform, profile_id, timeframe);
        CREATE INDEX IF NOT EXISTS idx_crm_lead_tags_conv ON crm_lead_tags(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_crm_lead_tags_tag ON crm_lead_tags(tag_id);
        CREATE INDEX IF NOT EXISTS idx_crm_notes_conv ON crm_notes(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_crm_followups_conv ON crm_followups(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_crm_followups_sched ON crm_followups(scheduled_at, status);
        CREATE INDEX IF NOT EXISTS idx_crm_events_conv ON crm_events(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_crm_statuses_pos ON crm_statuses(position);

        -- Tabela de Comandas / Pedidos de Venda
        CREATE TABLE IF NOT EXISTS crm_orders (
            id SERIAL PRIMARY KEY,
            order_code VARCHAR(50) NOT NULL UNIQUE,
            conversation_id INTEGER REFERENCES crm_conversations(id) ON DELETE SET NULL,
            customer_name VARCHAR(255) NOT NULL,
            customer_cpf VARCHAR(30),
            customer_email VARCHAR(255),
            customer_phone VARCHAR(50),
            delivery_address TEXT,
            delivery_method VARCHAR(50) NOT NULL DEFAULT 'uber_flash',
            shipping_fee NUMERIC(10,2) DEFAULT 0,
            subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
            discount NUMERIC(10,2) DEFAULT 0,
            total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
            payment_method VARCHAR(50) NOT NULL DEFAULT 'pix',
            installments INTEGER DEFAULT 1,
            installment_amount NUMERIC(10,2) DEFAULT 0,
            status VARCHAR(50) NOT NULL DEFAULT 'confirmado',
            notes TEXT,
            whatsapp_sent BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Itens de cada Pedido/Comanda
        CREATE TABLE IF NOT EXISTS crm_order_items (
            id SERIAL PRIMARY KEY,
            order_id INTEGER NOT NULL REFERENCES crm_orders(id) ON DELETE CASCADE,
            product_id INTEGER,
            product_name VARCHAR(255) NOT NULL,
            variant_name VARCHAR(100),
            quantity INTEGER NOT NULL DEFAULT 1,
            unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
            total_price NUMERIC(10,2) NOT NULL DEFAULT 0
        );

        -- Tabela de Lançamentos do Controle Financeiro (Receitas e Despesas)
        CREATE TABLE IF NOT EXISTS crm_financial_transactions (
            id SERIAL PRIMARY KEY,
            type VARCHAR(20) NOT NULL, -- 'receita' ou 'despesa'
            category VARCHAR(100) NOT NULL,
            description VARCHAR(255) NOT NULL,
            amount NUMERIC(10,2) NOT NULL,
            payment_method VARCHAR(50) DEFAULT 'pix',
            order_id INTEGER REFERENCES crm_orders(id) ON DELETE SET NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'pago', -- 'pago', 'pendente', 'cancelado'
            due_date DATE NOT NULL DEFAULT CURRENT_DATE,
            paid_at TIMESTAMPTZ,
            notes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_crm_orders_conv ON crm_orders(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_crm_orders_code ON crm_orders(order_code);
        CREATE INDEX IF NOT EXISTS idx_crm_order_items_order ON crm_order_items(order_id);
        CREATE INDEX IF NOT EXISTS idx_crm_fin_type ON crm_financial_transactions(type);
        CREATE INDEX IF NOT EXISTS idx_crm_fin_date ON crm_financial_transactions(due_date);
        CREATE INDEX IF NOT EXISTS idx_crm_fin_status ON crm_financial_transactions(status);
        
        -- Migrações de Estrutura Financeira e CRM
        ALTER TABLE crm_financial_transactions ADD COLUMN IF NOT EXISTS wallet VARCHAR(50) DEFAULT 'pix';
        ALTER TABLE crm_financial_transactions ADD COLUMN IF NOT EXISTS cost_amount NUMERIC(10,2) DEFAULT 0;
        ALTER TABLE crm_financial_transactions ADD COLUMN IF NOT EXISTS shipping_amount NUMERIC(10,2) DEFAULT 0;
        ALTER TABLE crm_financial_transactions ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;
        ALTER TABLE crm_financial_transactions ADD COLUMN IF NOT EXISTS product_id INTEGER;

        ALTER TABLE crm_order_items ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) DEFAULT 0;
      `);

      // Seed default statuses se tabela estiver vazia
      const statusCount = await client.query('SELECT COUNT(*) FROM crm_statuses');
      if (parseInt(statusCount.rows[0].count, 10) === 0) {
        const defaultStatuses = [
          { name: 'Novo Lead', slug: 'novo', color: '#3B82F6', icon: 'sparkles', position: 1, is_initial: true, is_won: false, is_lost: false },
          { name: 'Contato Inicial', slug: 'contato_inicial', color: '#6366F1', icon: 'message-circle', position: 2, is_initial: false, is_won: false, is_lost: false },
          { name: 'Qualificando', slug: 'qualificando', color: '#8B5CF6', icon: 'filter', position: 3, is_initial: false, is_won: false, is_lost: false },
          { name: 'Interessado', slug: 'interessado', color: '#EC4899', icon: 'heart', position: 4, is_initial: false, is_won: false, is_lost: false },
          { name: 'Negociando', slug: 'em_negociacao', color: '#F59E0B', icon: 'trending-up', position: 5, is_initial: false, is_won: false, is_lost: false },
          { name: 'Aguardando Pagamento', slug: 'aguardando_pagamento', color: '#F97316', icon: 'credit-card', position: 6, is_initial: false, is_won: false, is_lost: false },
          { name: 'Pago', slug: 'fechado', color: '#10B981', icon: 'check-circle-2', position: 7, is_initial: false, is_won: true, is_lost: false },
          { name: 'Concluído', slug: 'concluido', color: '#059669', icon: 'award', position: 8, is_initial: false, is_won: true, is_lost: false },
          { name: 'Perdido', slug: 'perdido', color: '#EF4444', icon: 'x-circle', position: 9, is_initial: false, is_won: false, is_lost: true },
        ];
        for (const st of defaultStatuses) {
          await client.query(
            `INSERT INTO crm_statuses (name, slug, color, icon, position, is_initial, is_won, is_lost)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (slug) DO NOTHING;`,
            [st.name, st.slug, st.color, st.icon, st.position, st.is_initial, st.is_won, st.is_lost]
          );
        }
      }

      // Seed default tags se tabela estiver vazia
      const tagCount = await client.query('SELECT COUNT(*) FROM crm_tags');
      if (parseInt(tagCount.rows[0].count, 10) === 0) {
        const defaultTags = [
          { name: 'Cliente VIP', slug: 'vip', color: '#8B5CF6' },
          { name: 'Atacado', slug: 'atacado', color: '#3B82F6' },
          { name: 'Perfume Árabe', slug: 'perfume_arabe', color: '#10B981' },
          { name: 'Miniaturas', slug: 'miniaturas', color: '#EC4899' },
          { name: 'Pagamento Pendente', slug: 'pagamento_pendente', color: '#F97316' },
          { name: 'Revendedor', slug: 'revendedor', color: '#06B6D4' },
          { name: 'Retornar Amanhã', slug: 'retornar_amanha', color: '#F59E0B' },
          { name: 'Cliente Antigo', slug: 'cliente_antigo', color: '#64748B' },
        ];
        for (const tg of defaultTags) {
          await client.query(
            `INSERT INTO crm_tags (name, slug, color) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING;`,
            [tg.name, tg.slug, tg.color]
          );
        }
      }


      // Migração e Limpeza de Clientes Duplicados:
      // 1. Remover índice antigo que permitia duplicação com profile_id diferente
      await client.query(`DROP INDEX IF EXISTS uq_crm_conv_plat_ext_prof;`);

      // 2. Limpar mensagens de sistema/lixo do Facebook e falsos contatos do Instagram
      await client.query(`
        DELETE FROM crm_messages WHERE conversation_id IN (
          SELECT id FROM crm_conversations
          WHERE customer_name ILIKE '%snackstorebh%'
             OR customer_name ILIKE '%professional dashboard%'
             OR customer_name ILIKE '%painel profissional%'
             OR customer_name ILIKE '%meta ai%'
             OR external_id ILIKE '%snackstorebh%'
             OR external_id ILIKE '%professional_dashboard%'
        );
        DELETE FROM crm_outgoing_queue WHERE conversation_id IN (
          SELECT id FROM crm_conversations
          WHERE customer_name ILIKE '%snackstorebh%'
             OR customer_name ILIKE '%professional dashboard%'
             OR customer_name ILIKE '%painel profissional%'
             OR customer_name ILIKE '%meta ai%'
             OR external_id ILIKE '%snackstorebh%'
             OR external_id ILIKE '%professional_dashboard%'
        );
        DELETE FROM crm_conversations 
        WHERE customer_name ILIKE '%snackstorebh%'
           OR customer_name ILIKE '%professional dashboard%'
           OR customer_name ILIKE '%painel profissional%'
           OR customer_name ILIKE '%meta ai%'
           OR external_id ILIKE '%snackstorebh%'
           OR external_id ILIKE '%professional_dashboard%'
           OR customer_name ILIKE '%Parece que publicaste este anúncio%'
           OR customer_name ILIKE '%Pedido de mensagem%'
           OR customer_name ILIKE '%Ativo agora%'
           OR customer_name = 'Cliente Atual';
      `);

      // Inserir dados reais de Insights como baseline inicial se a tabela estiver vazia
      const insightCount = await client.query(`SELECT COUNT(*) FROM crm_insights WHERE platform = 'instagram'`);
      if (parseInt(insightCount.rows[0].count, 10) === 0) {
        await client.query(`
          INSERT INTO crm_insights (
            profile_id, platform, timeframe,
            views, viewers, followers_views_pct, non_followers_views_pct,
            stories_views_pct, posts_views_pct, reels_views_pct,
            interactions, followers_interactions_pct, non_followers_interactions_pct,
            accounts_engaged, stories_interactions_pct, posts_interactions_pct, reels_interactions_pct,
            profile_activity, profile_visits, external_link_taps, total_followers,
            active_times, top_content_views, top_content_interactions, synced_at
          ) VALUES (
            0, 'instagram', 30,
            8485, 3219, 22.2, 77.8,
            67.1, 22.9, 10.0,
            138, 61.6, 38.4,
            55, 47.4, 40.8, 11.8,
            339, 270, 69, 1163,
            $1::jsonb, $2::jsonb, $3::jsonb, NOW()
          );
        `, [
          JSON.stringify([
            { hour: '12a', count: 129 },
            { hour: '3a', count: 343 },
            { hour: '6a', count: 423 },
            { hour: '9a', count: 426 },
            { hour: '12p', count: 442 },
            { hour: '3p', count: 462 },
            { hour: '6p', count: 288 },
            { hour: '9p', count: 72 }
          ]),
          JSON.stringify([
            { views: 116, date: 'Sep 8' },
            { views: 103, date: 'Aug 25' },
            { views: 92, date: 'Aug 15' },
            { views: 76, date: 'Aug 24' },
            { views: 74, date: 'Aug 15' }
          ]),
          JSON.stringify([
            { interactions: 7, date: 'Aug 25' },
            { interactions: 4, date: 'Aug 24' },
            { interactions: 3, date: 'Sep 3' },
            { interactions: 3, date: 'Sep 3' },
            { interactions: 3, date: 'Aug 28' }
          ])
        ]);
      }

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

      // 0. Bloqueia lixo, strings de status e prompts de sistema
      if (
        !cleanName ||
        cleanName === 'Cliente Atual' ||
        cleanName.toLowerCase().includes('parece que publicaste') ||
        cleanName.toLowerCase().includes('pedido de mensagem') ||
        cleanName.toLowerCase() === 'ativo agora'
      ) {
        return null as any;
      }

      // 1. Verifica se esta conversa foi previamente excluída pelo usuário
      const delCheck = await client.query(
        'SELECT 1 FROM crm_deleted_conversations WHERE platform = $1 AND external_id = $2',
        [data.platform, data.external_id]
      );
      if (delCheck.rows.length > 0) {
        return null as any;
      }

      const isGenericName = ['cliente', 'cliente facebook', 'cliente atual', 'pedido de mensagem', 'ativo agora'].includes(cleanName.toLowerCase());

      // 2. Se for um cliente com nome específico real, verificar se já existe conversa com ele nesta plataforma
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
          ORDER BY (external_id = $4) DESC, (product_title IS NOT NULL) DESC, last_message_at DESC, id DESC
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
  }): Promise<CrmMessage | null> {
    const client = await pool.connect();
    try {
      const cleanContent = (data.content || '').trim();
      if (!cleanContent) return null;

      // Filtra ruídos de interface do Facebook
      const noise = [
        'já se podem classificar',
        'as pessoas podem dar classificações',
        'classificar ',
        'mark as sold',
        'more options',
        'personalizar conversa',
        'membros da conversa',
        'multimédia',
        'privacidade e suporte',
        'pesquisar',
        'silenciar'
      ];
      const lower = cleanContent.toLowerCase();
      if (noise.some(n => lower.includes(n))) {
        return null;
      }

      // Avoid inserting exact duplicate message if same content sent within recent window
      const checkQuery = `
        SELECT id FROM crm_messages
        WHERE conversation_id = $1 AND content = $2 AND sender_type = $3
        ORDER BY id DESC LIMIT 1;
      `;
      const existing = await client.query(checkQuery, [data.conversation_id, cleanContent, data.sender_type]);
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
        cleanContent,
        data.external_id || null,
        data.sent_at || null,
      ]);
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Lists conversations with filters, profile name, dynamic tags, and next follow-up
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
  }): Promise<CrmConversation[]> {
    await this.ensureCrmTablesExist();
    const client = await pool.connect();
    try {
      let query = `
        SELECT 
          c.*, 
          p.name AS profile_name,
          COALESCE(tg.tags, '[]'::json) AS tags,
          nxt_f.next_followup
        FROM crm_conversations c
        LEFT JOIN browser_profiles p ON p.id = c.profile_id
        LEFT JOIN (
          SELECT lt.conversation_id, json_agg(json_build_object('id', t.id, 'name', t.name, 'slug', t.slug, 'color', t.color)) as tags
          FROM crm_lead_tags lt
          JOIN crm_tags t ON t.id = lt.tag_id
          GROUP BY lt.conversation_id
        ) tg ON tg.conversation_id = c.id
        LEFT JOIN (
          SELECT DISTINCT ON (conversation_id) 
            conversation_id, 
            json_build_object(
              'id', id, 
              'scheduled_at', scheduled_at, 
              'due_at', scheduled_at, 
              'followup_type', followup_type, 
              'type', followup_type, 
              'priority', priority, 
              'notes', notes, 
              'status', status
            ) as next_followup
          FROM crm_followups
          WHERE status = 'pending'
          ORDER BY conversation_id, scheduled_at ASC
        ) nxt_f ON nxt_f.conversation_id = c.id
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

      if (filter.lead_status && filter.lead_status !== 'all') {
        params.push(filter.lead_status);
        query += ` AND c.lead_status = $${params.length}`;
      }

      if (filter.tag_id) {
        params.push(filter.tag_id);
        query += ` AND EXISTS (SELECT 1 FROM crm_lead_tags WHERE conversation_id = c.id AND tag_id = $${params.length})`;
      }

      if (filter.marketplace_only) {
        query += ` AND (c.product_title IS NOT NULL OR c.product_price IS NOT NULL OR c.product_url IS NOT NULL OR c.platform = 'olx')`;
      }

      if (filter.search) {
        params.push(`%${filter.search}%`);
        query += ` AND (c.customer_name ILIKE $${params.length} OR c.product_title ILIKE $${params.length} OR c.last_message ILIKE $${params.length} OR c.customer_phone ILIKE $${params.length})`;
      }

      query += ` ORDER BY c.last_message_at DESC, c.id DESC`;

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
   * Gets conversation by ID with joined tags and next follow-up
   */
  async getConversationById(id: number): Promise<CrmConversation | null> {
    await this.ensureCrmTablesExist();
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          c.*, 
          p.name AS profile_name,
          COALESCE(tg.tags, '[]'::json) AS tags,
          nxt_f.next_followup
        FROM crm_conversations c
        LEFT JOIN browser_profiles p ON p.id = c.profile_id
        LEFT JOIN (
          SELECT lt.conversation_id, json_agg(json_build_object('id', t.id, 'name', t.name, 'slug', t.slug, 'color', t.color)) as tags
          FROM crm_lead_tags lt
          JOIN crm_tags t ON t.id = lt.tag_id
          GROUP BY lt.conversation_id
        ) tg ON tg.conversation_id = c.id
        LEFT JOIN (
          SELECT DISTINCT ON (conversation_id) 
            conversation_id, 
            json_build_object(
              'id', id, 
              'scheduled_at', scheduled_at, 
              'due_at', scheduled_at, 
              'followup_type', followup_type, 
              'type', followup_type, 
              'priority', priority, 
              'notes', notes, 
              'status', status
            ) as next_followup
          FROM crm_followups
          WHERE status = 'pending'
          ORDER BY conversation_id, scheduled_at ASC
        ) nxt_f ON nxt_f.conversation_id = c.id
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
   * Updates lead status, notes, phone, deal value, or location details
   */
  async updateConversationLead(id: number, data: {
    lead_status?: LeadStatus | string;
    notes?: string;
    customer_phone?: string;
    deal_value?: string;
    customer_city?: string;
    customer_state?: string;
    customer_address?: string;
    customer_assigned_to?: string;
    unread_count?: number;
  }): Promise<CrmConversation | null> {
    const client = await pool.connect();
    try {
      // Get previous status for event log
      let oldStatus: string | null = null;
      if (data.lead_status !== undefined) {
        const prevRes = await client.query('SELECT lead_status FROM crm_conversations WHERE id = $1', [id]);
        if (prevRes.rows.length > 0) {
          oldStatus = prevRes.rows[0].lead_status;
        }
      }

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

      if (data.customer_phone !== undefined) {
        params.push(data.customer_phone);
        updates.push(`customer_phone = $${params.length}`);
      }

      if (data.deal_value !== undefined) {
        params.push(data.deal_value);
        updates.push(`deal_value = $${params.length}`);
      }

      if (data.customer_city !== undefined) {
        params.push(data.customer_city);
        updates.push(`customer_city = $${params.length}`);
      }

      if (data.customer_state !== undefined) {
        params.push(data.customer_state);
        updates.push(`customer_state = $${params.length}`);
      }

      if (data.customer_address !== undefined) {
        params.push(data.customer_address);
        updates.push(`customer_address = $${params.length}`);
      }

      if (data.customer_assigned_to !== undefined) {
        params.push(data.customer_assigned_to);
        updates.push(`customer_assigned_to = $${params.length}`);
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
      const updated = res.rows[0] || null;

      // Se mudou o status, registra automaticamente na timeline estruturada
      if (updated && data.lead_status !== undefined && oldStatus !== data.lead_status) {
        await client.query(
          `INSERT INTO crm_events (conversation_id, event_type, title, description, metadata)
           VALUES ($1, 'LEAD_STATUS_CHANGED', $2, $3, $4)`,
          [
            id,
            'Status alterado',
            `Status alterado de "${oldStatus || 'Novo'}" para "${data.lead_status}"`,
            JSON.stringify({ old_status: oldStatus, new_status: data.lead_status })
          ]
        );
      }

      return updated;
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
      // Localiza platform e external_id antes de deletar para gravar na blacklist
      const check = await client.query(`SELECT platform, external_id FROM crm_conversations WHERE id = $1`, [id]);
      if (check.rows.length > 0) {
        const { platform, external_id } = check.rows[0];
        await client.query(`
          INSERT INTO crm_deleted_conversations (platform, external_id)
          VALUES ($1, $2)
          ON CONFLICT (platform, external_id) DO UPDATE SET deleted_at = NOW();
        `, [platform, external_id]);
      }

      const res = await client.query(`DELETE FROM crm_conversations WHERE id = $1 RETURNING id;`, [id]);
      return (res.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  /**
   * Bulk updates lead status for multiple conversations
   */
  async bulkUpdateStatus(ids: number[], status: LeadStatus): Promise<number> {
    if (!ids || ids.length === 0) return 0;
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE crm_conversations SET lead_status = $1, updated_at = NOW() WHERE id = ANY($2::int[]);`,
        [status, ids]
      );
      return res.rowCount || 0;
    } finally {
      client.release();
    }
  }

  /**
   * Bulk deletes multiple conversations and adds them to blacklist
   */
  async bulkDeleteConversations(ids: number[]): Promise<number> {
    if (!ids || ids.length === 0) return 0;
    const client = await pool.connect();
    try {
      // Obter platforms e external_ids para a blacklist
      const check = await client.query(
        `SELECT platform, external_id FROM crm_conversations WHERE id = ANY($1::int[])`,
        [ids]
      );
      for (const row of check.rows) {
        await client.query(`
          INSERT INTO crm_deleted_conversations (platform, external_id)
          VALUES ($1, $2)
          ON CONFLICT (platform, external_id) DO UPDATE SET deleted_at = NOW();
        `, [row.platform, row.external_id]);
      }

      const res = await client.query(`DELETE FROM crm_conversations WHERE id = ANY($1::int[]);`, [ids]);
      return res.rowCount || 0;
    } finally {
      client.release();
    }
  }

  /**
   * Salva dados de insights raspados da página do Instagram
   */
  async saveInsights(data: CrmInsightData): Promise<CrmInsightData> {
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO crm_insights (
          profile_id, platform, timeframe,
          views, viewers, followers_views_pct, non_followers_views_pct,
          stories_views_pct, posts_views_pct, reels_views_pct,
          interactions, followers_interactions_pct, non_followers_interactions_pct,
          accounts_engaged, stories_interactions_pct, posts_interactions_pct, reels_interactions_pct,
          profile_activity, profile_visits, external_link_taps, total_followers,
          active_times, top_content_views, top_content_interactions, raw_data, synced_at
        ) VALUES (
          COALESCE($1, 0), COALESCE($2, 'instagram'), COALESCE($3, 30),
          $4, $5, $6, $7,
          $8, $9, $10,
          $11, $12, $13,
          $14, $15, $16, $17,
          $18, $19, $20, $21,
          $22::jsonb, $23::jsonb, $24::jsonb, $25::jsonb, NOW()
        )
        RETURNING *;
      `;
      const values = [
        data.profile_id || 0,
        data.platform || 'instagram',
        data.timeframe || 30,
        data.views || 0,
        data.viewers || 0,
        data.followers_views_pct || 0,
        data.non_followers_views_pct || 0,
        data.stories_views_pct || 0,
        data.posts_views_pct || 0,
        data.reels_views_pct || 0,
        data.interactions || 0,
        data.followers_interactions_pct || 0,
        data.non_followers_interactions_pct || 0,
        data.accounts_engaged || 0,
        data.stories_interactions_pct || 0,
        data.posts_interactions_pct || 0,
        data.reels_interactions_pct || 0,
        data.profile_activity || 0,
        data.profile_visits || 0,
        data.external_link_taps || 0,
        data.total_followers || 0,
        JSON.stringify(data.active_times || []),
        JSON.stringify(data.top_content_views || []),
        JSON.stringify(data.top_content_interactions || []),
        JSON.stringify(data.raw_data || {}),
      ];

      const res = await client.query(query, values);
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Obtém os insights mais recentes do Instagram / Meta
   */
  async getLatestInsights(profileId?: number, timeframe: number = 30): Promise<CrmInsightData | null> {
    const client = await pool.connect();
    try {
      let query = `
        SELECT * FROM crm_insights
        WHERE platform = 'instagram'
      `;
      const params: any[] = [];
      if (timeframe) {
        params.push(timeframe);
        query += ` AND timeframe = $${params.length}`;
      }
      if (profileId !== undefined && profileId > 0) {
        params.push(profileId);
        query += ` AND (profile_id = $${params.length} OR profile_id = 0)`;
      }
      query += ` ORDER BY (profile_id > 0) DESC, synced_at DESC, id DESC LIMIT 1;`;

      const res = await client.query(query, params);
      if (res.rows.length > 0) {
        return res.rows[0];
      }

      // Fallback global
      const fallback = await client.query(`
        SELECT * FROM crm_insights
        WHERE platform = 'instagram'
        ORDER BY synced_at DESC, id DESC LIMIT 1;
      `);
      return fallback.rows[0] || null;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // STATUSES PERSONALIZADOS
  // ==========================================

  async listStatuses(): Promise<CrmCustomStatus[]> {
    await this.ensureCrmTablesExist();
    const client = await pool.connect();
    try {
      const res = await client.query(`SELECT * FROM crm_statuses WHERE is_active = true ORDER BY position ASC, id ASC`);
      return res.rows;
    } finally {
      client.release();
    }
  }

  async createStatus(data: {
    name: string;
    slug?: string;
    color: string;
    icon?: string;
    position?: number;
    is_initial?: boolean;
    is_won?: boolean;
    is_lost?: boolean;
  }): Promise<CrmCustomStatus> {
    await this.ensureCrmTablesExist();
    const client = await pool.connect();
    try {
      const slug = data.slug || data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');
      const res = await client.query(
        `INSERT INTO crm_statuses (name, slug, color, icon, position, is_initial, is_won, is_lost)
         VALUES ($1, $2, $3, $4, COALESCE($5, 0), COALESCE($6, false), COALESCE($7, false), COALESCE($8, false))
         RETURNING *;`,
        [data.name.trim(), slug, data.color || '#3B82F6', data.icon || 'bookmark', data.position, data.is_initial, data.is_won, data.is_lost]
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async updateStatus(id: number, data: Partial<CrmCustomStatus>): Promise<CrmCustomStatus | null> {
    const client = await pool.connect();
    try {
      const updates: string[] = ['updated_at = NOW()'];
      const params: any[] = [id];

      if (data.name !== undefined) {
        params.push(data.name);
        updates.push(`name = $${params.length}`);
      }
      if (data.color !== undefined) {
        params.push(data.color);
        updates.push(`color = $${params.length}`);
      }
      if (data.icon !== undefined) {
        params.push(data.icon);
        updates.push(`icon = $${params.length}`);
      }
      if (data.position !== undefined) {
        params.push(data.position);
        updates.push(`position = $${params.length}`);
      }
      if (data.is_initial !== undefined) {
        params.push(data.is_initial);
        updates.push(`is_initial = $${params.length}`);
      }
      if (data.is_won !== undefined) {
        params.push(data.is_won);
        updates.push(`is_won = $${params.length}`);
      }
      if (data.is_lost !== undefined) {
        params.push(data.is_lost);
        updates.push(`is_lost = $${params.length}`);
      }

      const res = await client.query(
        `UPDATE crm_statuses SET ${updates.join(', ')} WHERE id = $1 RETURNING *;`,
        params
      );
      return res.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async deleteStatus(id: number): Promise<boolean> {
    const client = await pool.connect();
    try {
      const res = await client.query(`DELETE FROM crm_statuses WHERE id = $1`, [id]);
      return (res.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // TAGS PERSONALIZADAS
  // ==========================================

  async listTags(): Promise<CrmTag[]> {
    await this.ensureCrmTablesExist();
    const client = await pool.connect();
    try {
      const res = await client.query(`SELECT * FROM crm_tags ORDER BY name ASC`);
      return res.rows;
    } finally {
      client.release();
    }
  }

  async createTag(data: { name: string; color?: string }): Promise<CrmTag> {
    await this.ensureCrmTablesExist();
    const client = await pool.connect();
    try {
      const slug = data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');
      const res = await client.query(
        `INSERT INTO crm_tags (name, slug, color)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
         RETURNING *;`,
        [data.name.trim(), slug, data.color || '#3B82F6']
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async deleteTag(id: number): Promise<boolean> {
    const client = await pool.connect();
    try {
      const res = await client.query(`DELETE FROM crm_tags WHERE id = $1`, [id]);
      return (res.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  async addTagToLead(conversationId: number, tagId: number): Promise<void> {
    await this.ensureCrmTablesExist();
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO crm_lead_tags (conversation_id, tag_id)
         VALUES ($1, $2)
         ON CONFLICT (conversation_id, tag_id) DO NOTHING;`,
        [conversationId, tagId]
      );

      // Busca dados da tag para timeline
      const tagRes = await client.query(`SELECT name FROM crm_tags WHERE id = $1`, [tagId]);
      const tagName = tagRes.rows[0]?.name || 'Tag';

      await client.query(
        `INSERT INTO crm_events (conversation_id, event_type, title, description, metadata)
         VALUES ($1, 'TAG_ADDED', 'Tag adicionada', $2, $3)`,
        [conversationId, `Tag "${tagName}" atribuída ao lead`, JSON.stringify({ tag_id: tagId, tag_name: tagName })]
      );
    } finally {
      client.release();
    }
  }

  async removeTagFromLead(conversationId: number, tagId: number): Promise<void> {
    const client = await pool.connect();
    try {
      const tagRes = await client.query(`SELECT name FROM crm_tags WHERE id = $1`, [tagId]);
      const tagName = tagRes.rows[0]?.name || 'Tag';

      await client.query(
        `DELETE FROM crm_lead_tags WHERE conversation_id = $1 AND tag_id = $2;`,
        [conversationId, tagId]
      );

      await client.query(
        `INSERT INTO crm_events (conversation_id, event_type, title, description, metadata)
         VALUES ($1, 'TAG_REMOVED', 'Tag removida', $2, $3)`,
        [conversationId, `Tag "${tagName}" desvinculada do lead`, JSON.stringify({ tag_id: tagId, tag_name: tagName })]
      );
    } finally {
      client.release();
    }
  }

  async getLeadTags(conversationId: number): Promise<CrmTag[]> {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT t.* FROM crm_tags t
         JOIN crm_lead_tags lt ON lt.tag_id = t.id
         WHERE lt.conversation_id = $1
         ORDER BY t.name ASC`,
        [conversationId]
      );
      return res.rows;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // NOTAS INTERNAS
  // ==========================================

  async getLeadNotes(conversationId: number): Promise<CrmNote[]> {
    await this.ensureCrmTablesExist();
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT * FROM crm_notes WHERE conversation_id = $1 ORDER BY created_at DESC;`,
        [conversationId]
      );
      return res.rows;
    } finally {
      client.release();
    }
  }

  async createLeadNote(conversationId: number, noteText: string, authorName = 'Atendente'): Promise<CrmNote> {
    await this.ensureCrmTablesExist();
    const client = await pool.connect();
    try {
      const res = await client.query(
        `INSERT INTO crm_notes (conversation_id, note_text, author_name)
         VALUES ($1, $2, $3)
         RETURNING *;`,
        [conversationId, noteText.trim(), authorName]
      );
      const note = res.rows[0];

      await client.query(
        `INSERT INTO crm_events (conversation_id, event_type, title, description, metadata)
         VALUES ($1, 'NOTE_ADDED', 'Nota interna registrada', $2, $3)`,
        [conversationId, `${authorName}: "${noteText.trim()}"`, JSON.stringify({ note_id: note.id, author: authorName })]
      );

      return note;
    } finally {
      client.release();
    }
  }

  async deleteLeadNote(noteId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
      const res = await client.query(`DELETE FROM crm_notes WHERE id = $1`, [noteId]);
      return (res.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // FOLLOW-UPS E AGENDAMENTOS
  // ==========================================

  async listFollowups(filter?: {
    status?: string;
    timeframe?: 'today' | 'overdue' | 'tomorrow' | 'upcoming' | 'completed' | 'all';
    profile_id?: number;
  }): Promise<CrmFollowup[]> {
    await this.ensureCrmTablesExist();
    const client = await pool.connect();
    try {
      let query = `
        SELECT 
          f.*,
          f.scheduled_at as due_at,
          f.followup_type as type,
          c.customer_name,
          c.customer_phone,
          c.platform
        FROM crm_followups f
        JOIN crm_conversations c ON c.id = f.conversation_id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filter?.profile_id) {
        params.push(filter.profile_id);
        query += ` AND f.profile_id = $${params.length}`;
      }

      if (filter?.status && filter.status !== 'all') {
        params.push(filter.status);
        query += ` AND f.status = $${params.length}`;
      }

      if (filter?.timeframe) {
        if (filter.timeframe === 'overdue') {
          query += ` AND f.status = 'pending' AND f.scheduled_at < NOW()`;
        } else if (filter.timeframe === 'today') {
          query += ` AND f.status = 'pending' AND f.scheduled_at >= CURRENT_DATE AND f.scheduled_at < CURRENT_DATE + INTERVAL '1 day'`;
        } else if (filter.timeframe === 'tomorrow') {
          query += ` AND f.status = 'pending' AND f.scheduled_at >= CURRENT_DATE + INTERVAL '1 day' AND f.scheduled_at < CURRENT_DATE + INTERVAL '2 days'`;
        } else if (filter.timeframe === 'upcoming') {
          query += ` AND f.status = 'pending' AND f.scheduled_at >= CURRENT_DATE + INTERVAL '2 days'`;
        } else if (filter.timeframe === 'completed') {
          query += ` AND f.status = 'completed'`;
        }
      }

      query += ` ORDER BY f.scheduled_at ASC, f.id ASC LIMIT 100;`;

      const res = await client.query(query, params);
      return res.rows;
    } finally {
      client.release();
    }
  }

  async getLeadFollowups(conversationId: number): Promise<CrmFollowup[]> {
    await this.ensureCrmTablesExist();
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT *, scheduled_at as due_at, followup_type as type FROM crm_followups WHERE conversation_id = $1 ORDER BY scheduled_at ASC;`,
        [conversationId]
      );
      return res.rows;
    } finally {
      client.release();
    }
  }

  async createFollowup(data: {
    conversation_id: number;
    profile_id?: number;
    scheduled_at: Date | string;
    followup_type?: string;
    priority?: string;
    notes?: string;
    assignee?: string;
  }): Promise<CrmFollowup> {
    await this.ensureCrmTablesExist();
    const client = await pool.connect();
    try {
      const res = await client.query(
        `INSERT INTO crm_followups (conversation_id, profile_id, scheduled_at, followup_type, priority, notes, assignee, status)
         VALUES ($1, COALESCE($2, 0), $3, COALESCE($4, 'WhatsApp'), COALESCE($5, 'normal'), $6, COALESCE($7, 'Operador'), 'pending')
         RETURNING *;`,
        [
          data.conversation_id,
          data.profile_id,
          data.scheduled_at,
          data.followup_type,
          data.priority,
          data.notes || null,
          data.assignee
        ]
      );
      const followup = res.rows[0];

      const dt = new Date(data.scheduled_at).toLocaleString('pt-BR');
      await client.query(
        `INSERT INTO crm_events (conversation_id, event_type, title, description, metadata)
         VALUES ($1, 'FOLLOWUP_CREATED', 'Follow-up agendado', $2, $3)`,
        [
          data.conversation_id,
          `Follow-up (${followup.followup_type}) agendado para ${dt}. ${data.notes ? `Obs: ${data.notes}` : ''}`,
          JSON.stringify(followup)
        ]
      );

      return {
        ...followup,
        due_at: followup.scheduled_at,
        type: followup.followup_type,
      };
    } finally {
      client.release();
    }
  }

  async updateFollowup(id: number, data: {
    status?: string;
    scheduled_at?: Date | string;
    notes?: string;
    priority?: string;
    completed_at?: Date | string | null;
  }): Promise<CrmFollowup | null> {
    const client = await pool.connect();
    try {
      const updates: string[] = ['updated_at = NOW()'];
      const params: any[] = [id];

      if (data.status !== undefined) {
        params.push(data.status);
        updates.push(`status = $${params.length}`);
        if (data.status === 'completed') {
          updates.push(`completed_at = NOW()`);
        }
      }

      if (data.scheduled_at !== undefined) {
        params.push(data.scheduled_at);
        updates.push(`scheduled_at = $${params.length}`);
      }

      if (data.notes !== undefined) {
        params.push(data.notes);
        updates.push(`notes = $${params.length}`);
      }

      if (data.priority !== undefined) {
        params.push(data.priority);
        updates.push(`priority = $${params.length}`);
      }

      const res = await client.query(
        `UPDATE crm_followups SET ${updates.join(', ')} WHERE id = $1 RETURNING *;`,
        params
      );
      const followup = res.rows[0] || null;

      if (followup) {
        if (data.status === 'completed') {
          await client.query(
            `INSERT INTO crm_events (conversation_id, event_type, title, description, metadata)
             VALUES ($1, 'FOLLOWUP_COMPLETED', 'Follow-up concluído', $2, $3)`,
            [followup.conversation_id, `Follow-up (${followup.followup_type}) marcado como concluído.`, JSON.stringify(followup)]
          );
        } else if (data.scheduled_at !== undefined) {
          const dt = new Date(data.scheduled_at).toLocaleString('pt-BR');
          await client.query(
            `INSERT INTO crm_events (conversation_id, event_type, title, description, metadata)
             VALUES ($1, 'FOLLOWUP_RESCHEDULED', 'Follow-up reagendado', $2, $3)`,
            [followup.conversation_id, `Follow-up reagendado para ${dt}.`, JSON.stringify(followup)]
          );
        }
      }

      return followup
        ? {
            ...followup,
            due_at: followup.scheduled_at,
            type: followup.followup_type,
          }
        : null;
    } finally {
      client.release();
    }
  }

  async deleteFollowup(id: number): Promise<boolean> {
    const client = await pool.connect();
    try {
      const res = await client.query(`DELETE FROM crm_followups WHERE id = $1`, [id]);
      return (res.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // TIMELINE E EVENTOS ESTRUTURADOS
  // ==========================================

  async getLeadTimeline(conversationId: number, limit = 50): Promise<CrmEvent[]> {
    await this.ensureCrmTablesExist();
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT * FROM crm_events WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT $2;`,
        [conversationId, limit]
      );
      return res.rows;
    } finally {
      client.release();
    }
  }

  async recordEvent(
    conversationId: number,
    eventType: string,
    title: string,
    description?: string,
    metadata?: any
  ): Promise<CrmEvent> {
    await this.ensureCrmTablesExist();
    const client = await pool.connect();
    try {
      const res = await client.query(
        `INSERT INTO crm_events (conversation_id, event_type, title, description, metadata)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *;`,
        [conversationId, eventType, title, description || null, JSON.stringify(metadata || {})]
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  // ==========================================
  // COMANDAS / PEDIDOS DE VENDA
  // ==========================================

  async createOrder(data: CreateOrderInput): Promise<CrmOrder> {
    await this.ensureCrmTablesExist();
    const client = await pool.connect();
    let released = false;

    try {
      await client.query('BEGIN');

      const orderCode = data.order_code || `VND-${Date.now().toString().slice(-8)}`;
      const shippingFee = Number(data.shipping_fee) || 0;
      const discount = Number(data.discount) || 0;

      // Calcular subtotal e total
      let subtotal = 0;
      for (const item of data.items) {
        subtotal += (Number(item.unit_price) || 0) * (Number(item.quantity) || 1);
      }
      const totalAmount = Math.max(0, subtotal + shippingFee - discount);
      const installments = Number(data.installments) || 1;
      const installmentAmount = Number(data.installment_amount) || (installments > 1 ? Number((totalAmount / installments).toFixed(2)) : totalAmount);

      const orderRes = await client.query(
        `INSERT INTO crm_orders (
            order_code, conversation_id, customer_name, customer_cpf,
            customer_email, customer_phone, delivery_address, delivery_method,
            shipping_fee, subtotal, discount, total_amount, payment_method,
            installments, installment_amount, status, notes, whatsapp_sent
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         RETURNING *;`,
        [
          orderCode,
          data.conversation_id || null,
          data.customer_name.trim(),
          data.customer_cpf?.trim() || null,
          data.customer_email?.trim() || null,
          data.customer_phone?.trim() || null,
          data.delivery_address?.trim() || null,
          data.delivery_method || 'uber_flash',
          shippingFee,
          subtotal,
          discount,
          totalAmount,
          data.payment_method || 'pix',
          installments,
          installmentAmount,
          'confirmado',
          data.notes?.trim() || null,
          data.send_whatsapp || false,
        ]
      );

      const order = orderRes.rows[0];

      // Inserir itens
      const savedItems: CrmOrderItem[] = [];
      for (const it of data.items) {
        const itemQty = Number(it.quantity) || 1;
        const itemUnit = Number(it.unit_price) || 0;
        const itemTotal = Number((itemQty * itemUnit).toFixed(2));

        const itemRes = await client.query(
          `INSERT INTO crm_order_items (
              order_id, product_id, product_name, variant_name, quantity, unit_price, total_price
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *;`,
          [
            order.id,
            it.product_id || null,
            it.product_name.trim(),
            it.variant_name?.trim() || null,
            itemQty,
            itemUnit,
            itemTotal,
          ]
        );
        savedItems.push(itemRes.rows[0]);
      }

      // 1. Integrar com o Controle Financeiro: registrar automaticamente a Receita
      await client.query(
        `INSERT INTO crm_financial_transactions (
            type, category, description, amount, payment_method, order_id, status, due_date, paid_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, NOW());`,
        [
          'receita',
          'Vendas - Comanda',
          `Venda #${orderCode} - ${data.customer_name}`,
          totalAmount,
          data.payment_method || 'pix',
          order.id,
          'pago',
        ]
      );

      // 2. Se houver conversa associada, registrar na Timeline e atualizar valor negociado do lead
      if (data.conversation_id) {
        await client.query(
          `UPDATE crm_conversations
           SET deal_value = $1, lead_status = 'fechado', updated_at = NOW()
           WHERE id = $2;`,
          [`R$ ${totalAmount.toFixed(2).replace('.', ',')}`, data.conversation_id]
        );

        await client.query(
          `INSERT INTO crm_events (conversation_id, event_type, title, description, metadata)
           VALUES ($1, $2, $3, $4, $5);`,
          [
            data.conversation_id,
            'order_created',
            `Comanda Gerada: #${orderCode} (R$ ${totalAmount.toFixed(2).replace('.', ',')})`,
            `Itens: ${savedItems.map((i) => `${i.quantity}x ${i.product_name}`).join(', ')} | Entrega: ${data.delivery_method}`,
            JSON.stringify({ order_id: order.id, order_code: orderCode, total: totalAmount }),
          ]
        );
      }

      await client.query('COMMIT');
      client.release();
      released = true;

      return {
        ...order,
        items: savedItems,
      };
    } catch (err) {
      if (!released) {
        try { await client.query('ROLLBACK'); } catch {}
        client.release();
      }
      throw err;
    }
  }

  async listOrders(filter: {
    conversation_id?: number;
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ orders: CrmOrder[]; total: number }> {
    await this.ensureCrmTablesExist();
    const client = await pool.connect();

    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (filter.conversation_id) {
        conditions.push(`o.conversation_id = $${idx++}`);
        params.push(filter.conversation_id);
      }

      if (filter.status && filter.status !== 'all') {
        conditions.push(`o.status = $${idx++}`);
        params.push(filter.status);
      }

      if (filter.search && filter.search.trim()) {
        conditions.push(`(o.order_code ILIKE $${idx} OR o.customer_name ILIKE $${idx} OR o.customer_phone ILIKE $${idx})`);
        params.push(`%${filter.search.trim()}%`);
        idx++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countRes = await client.query(`SELECT COUNT(*) FROM crm_orders o ${whereClause};`, params);
      const total = parseInt(countRes.rows[0].count, 10);

      const limit = filter.limit || 50;
      const offset = filter.offset || 0;
      params.push(limit, offset);

      const ordersRes = await client.query(
        `SELECT o.*,
                COALESCE(
                  (SELECT json_agg(i.*) FROM crm_order_items i WHERE i.order_id = o.id),
                  '[]'::json
                ) as items
         FROM crm_orders o
         ${whereClause}
         ORDER BY o.created_at DESC
         LIMIT $${idx++} OFFSET $${idx++};`,
        params
      );

      return {
        orders: ordersRes.rows.map(r => ({
          ...r,
          shipping_fee: Number(r.shipping_fee),
          subtotal: Number(r.subtotal),
          discount: Number(r.discount),
          total_amount: Number(r.total_amount),
          installment_amount: Number(r.installment_amount),
        })),
        total,
      };
    } finally {
      client.release();
    }
  }

  async getOrderById(id: number): Promise<CrmOrder | null> {
    await this.ensureCrmTablesExist();
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT o.*,
                COALESCE(
                  (SELECT json_agg(i.*) FROM crm_order_items i WHERE i.order_id = o.id),
                  '[]'::json
                ) as items
         FROM crm_orders o
         WHERE o.id = $1;`,
        [id]
      );
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        ...r,
        shipping_fee: Number(r.shipping_fee),
        subtotal: Number(r.subtotal),
        discount: Number(r.discount),
        total_amount: Number(r.total_amount),
        installment_amount: Number(r.installment_amount),
      };
    } finally {
      client.release();
    }
  }

  async deleteOrder(id: number): Promise<boolean> {
    await this.ensureCrmTablesExist();
    const client = await pool.connect();
    let released = false;
    try {
      await client.query('BEGIN');
      const orderRes = await client.query(
        `SELECT id, order_code, conversation_id, total_amount FROM crm_orders WHERE id = $1;`,
        [id]
      );
      if (orderRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }
      const order = orderRes.rows[0];

      // 1. Excluir transações financeiras vinculadas a este pedido
      await client.query(`DELETE FROM crm_financial_transactions WHERE order_id = $1;`, [id]);

      // 2. Excluir itens do pedido
      await client.query(`DELETE FROM crm_order_items WHERE order_id = $1;`, [id]);

      // 3. Excluir o pedido
      const deleteRes = await client.query(`DELETE FROM crm_orders WHERE id = $1;`, [id]);

      // 4. Registrar evento na timeline da conversa se aplicável
      if (order.conversation_id) {
        await client.query(
          `INSERT INTO crm_events (conversation_id, event_type, title, description, metadata)
           VALUES ($1, $2, $3, $4, $5);`,
          [
            order.conversation_id,
            'order_deleted',
            `Comanda Cancelada/Excluída: #${order.order_code}`,
            `A comanda no valor de R$ ${Number(order.total_amount).toFixed(2).replace('.', ',')} foi removida do sistema.`,
            JSON.stringify({ order_id: id, order_code: order.order_code, total: Number(order.total_amount) }),
          ]
        );
      }

      await client.query('COMMIT');
      client.release();
      released = true;
      return (deleteRes.rowCount || 0) > 0;
    } catch (err) {
      if (!released) {
        try { await client.query('ROLLBACK'); } catch {}
        client.release();
      }
      throw err;
    }
  }

  // ==========================================
  // CONTROLE FINANCEIRO
  // ==========================================

  async createFinancialTransaction(data: CreateFinancialTransactionInput): Promise<CrmFinancialTransaction> {
    await this.ensureCrmTablesExist();
    const client = await pool.connect();
    try {
      const amount = Number(data.amount) || 0;
      const res = await client.query(
        `INSERT INTO crm_financial_transactions (
            type, category, description, amount, payment_method, order_id, status, due_date, paid_at, notes,
            wallet, cost_amount, shipping_amount, discount_amount, product_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *;`,
        [
          data.type,
          data.category.trim(),
          data.description.trim(),
          amount,
          data.payment_method || 'pix',
          data.order_id || null,
          data.status || 'pago',
          data.due_date || new Date().toISOString().split('T')[0],
          data.status === 'pago' ? new Date() : null,
          data.notes?.trim() || null,
          data.wallet || 'pix',
          Number(data.cost_amount) || 0,
          Number(data.shipping_amount) || 0,
          Number(data.discount_amount) || 0,
          data.product_id || null
        ]
      );
      const r = res.rows[0];
      return {
        ...r,
        amount: Number(r.amount),
      };
    } finally {
      client.release();
    }
  }

  async listFinancialTransactions(filter: {
    type?: string;
    category?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ transactions: CrmFinancialTransaction[]; total: number }> {
    await this.ensureCrmTablesExist();
    const client = await pool.connect();

    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (filter.type && filter.type !== 'all') {
        conditions.push(`t.type = $${idx++}`);
        params.push(filter.type);
      }

      if (filter.category && filter.category !== 'all') {
        conditions.push(`t.category = $${idx++}`);
        params.push(filter.category);
      }

      if (filter.status && filter.status !== 'all') {
        conditions.push(`t.status = $${idx++}`);
        params.push(filter.status);
      }

      if (filter.start_date) {
        conditions.push(`t.due_date >= $${idx++}`);
        params.push(filter.start_date);
      }

      if (filter.end_date) {
        conditions.push(`t.due_date <= $${idx++}`);
        params.push(filter.end_date);
      }

      if (filter.search && filter.search.trim()) {
        conditions.push(`(t.description ILIKE $${idx} OR t.category ILIKE $${idx} OR t.payment_method ILIKE $${idx})`);
        params.push(`%${filter.search.trim()}%`);
        idx++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countRes = await client.query(`SELECT COUNT(*) FROM crm_financial_transactions t ${whereClause};`, params);
      const total = parseInt(countRes.rows[0].count, 10);

      const limit = filter.limit || 100;
      const offset = filter.offset || 0;
      params.push(limit, offset);

      const res = await client.query(
        `SELECT t.*,
                o.order_code as order_code,
                o.customer_name as order_customer_name
         FROM crm_financial_transactions t
         LEFT JOIN crm_orders o ON o.id = t.order_id
         ${whereClause}
         ORDER BY t.due_date DESC, t.id DESC
         LIMIT $${idx++} OFFSET $${idx++};`,
        params
      );

      return {
        transactions: res.rows.map(r => ({
          ...r,
          amount: Number(r.amount),
          cost_amount: Number(r.cost_amount || 0),
          shipping_amount: Number(r.shipping_amount || 0),
          discount_amount: Number(r.discount_amount || 0),
        })),
        total,
      };
    } finally {
      client.release();
    }
  }

  async deleteFinancialTransaction(id: number): Promise<boolean> {
    await this.ensureCrmTablesExist();
    const client = await pool.connect();
    let released = false;
    try {
      await client.query('BEGIN');
      const txRes = await client.query(`SELECT id, order_id FROM crm_financial_transactions WHERE id = $1;`, [id]);
      if (txRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }
      const tx = txRes.rows[0];

      // Se este lançamento estiver vinculado a um pedido, excluir o pedido e seus itens do CRM
      if (tx.order_id) {
        await client.query(`DELETE FROM crm_order_items WHERE order_id = $1;`, [tx.order_id]);
        await client.query(`DELETE FROM crm_orders WHERE id = $1;`, [tx.order_id]);
      }

      const res = await client.query(`DELETE FROM crm_financial_transactions WHERE id = $1;`, [id]);
      await client.query('COMMIT');
      client.release();
      released = true;
      return (res.rowCount || 0) > 0;
    } catch (err) {
      if (!released) {
        try { await client.query('ROLLBACK'); } catch {}
        client.release();
      }
      throw err;
    }
  }

  async getFinancialSummary(): Promise<FinancialSummary> {
    await this.ensureCrmTablesExist();
    const client = await pool.connect();
    try {
      const res = await client.query(`
        SELECT
          COALESCE(SUM(CASE WHEN type = 'receita' AND status = 'pago' THEN amount ELSE 0 END), 0) as total_income,
          COALESCE(SUM(CASE WHEN type = 'despesa' AND status = 'pago' THEN amount ELSE 0 END), 0) as total_expenses,
          COALESCE(SUM(CASE WHEN type = 'receita' AND status = 'pendente' THEN amount ELSE 0 END), 0) as pending_income,
          COALESCE(SUM(CASE WHEN type = 'despesa' AND status = 'pendente' THEN amount ELSE 0 END), 0) as pending_expenses,
          COUNT(*) as recent_count
        FROM crm_financial_transactions;
      `);

      const row = res.rows[0];
      const totalIncome = Number(row.total_income);
      const totalExpenses = Number(row.total_expenses);

      return {
        balance: totalIncome - totalExpenses,
        total_income: totalIncome,
        total_expenses: totalExpenses,
        pending_income: Number(row.pending_income),
        pending_expenses: Number(row.pending_expenses),
        recent_count: parseInt(row.recent_count, 10),
      };
    } finally {
      client.release();
    }
  }
}

export const crmRepository = new CrmRepository();


