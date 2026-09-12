-- 004_create_crm_tables.sql
-- Tabela de conversas / leads do CRM
CREATE TABLE IF NOT EXISTS crm_conversations (
    id SERIAL PRIMARY KEY,
    profile_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
    platform VARCHAR(50) NOT NULL DEFAULT 'facebook', -- 'facebook', 'olx', 'whatsapp'
    external_id VARCHAR(255) NOT NULL, -- ID único da conversa na plataforma (ex: thread ID do Facebook)
    customer_name VARCHAR(255) NOT NULL DEFAULT 'Cliente',
    customer_avatar TEXT,
    product_title TEXT,
    product_price VARCHAR(100),
    product_image TEXT,
    product_url TEXT,
    last_message TEXT,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unread_count INTEGER NOT NULL DEFAULT 0,
    lead_status VARCHAR(50) NOT NULL DEFAULT 'novo', -- 'novo', 'em_negociacao', 'fechado', 'perdido'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_platform_external_profile UNIQUE (platform, external_id, profile_id)
);

-- Tabela de mensagens individuais de cada conversa
CREATE TABLE IF NOT EXISTS crm_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES crm_conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL DEFAULT 'customer', -- 'customer' ou 'me'
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
    profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    message_text TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    attempts INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

-- Índices de performance para busca rápida
CREATE INDEX IF NOT EXISTS idx_crm_conv_platform ON crm_conversations(platform);
CREATE INDEX IF NOT EXISTS idx_crm_conv_profile ON crm_conversations(profile_id);
CREATE INDEX IF NOT EXISTS idx_crm_conv_updated ON crm_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_msg_conv ON crm_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_crm_queue_status ON crm_outgoing_queue(status, profile_id);
