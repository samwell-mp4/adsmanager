-- Migration 002: Create browser_profiles table

CREATE TABLE IF NOT EXISTS browser_profiles (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    group_name VARCHAR(100) NOT NULL DEFAULT 'Default',
    status VARCHAR(50) NOT NULL DEFAULT 'stopped' CHECK (status IN ('stopped', 'starting', 'running', 'stopping', 'error')),
    chrome_data_path VARCHAR(500) NOT NULL,
    container_name VARCHAR(255),
    novnc_port INTEGER,
    vnc_port INTEGER,
    cdp_port INTEGER,
    screen_width INTEGER NOT NULL DEFAULT 1920,
    screen_height INTEGER NOT NULL DEFAULT 1080,
    locale VARCHAR(50) NOT NULL DEFAULT 'pt-BR',
    timezone VARCHAR(100) NOT NULL DEFAULT 'America/Sao_Paulo',
    proxy_id INTEGER REFERENCES browser_proxies(id) ON DELETE SET NULL,
    last_started_at TIMESTAMPTZ,
    last_stopped_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_browser_profiles_status ON browser_profiles(status);
CREATE INDEX IF NOT EXISTS idx_browser_profiles_group ON browser_profiles(group_name);
CREATE INDEX IF NOT EXISTS idx_browser_profiles_proxy_id ON browser_profiles(proxy_id);
CREATE INDEX IF NOT EXISTS idx_browser_profiles_uuid ON browser_profiles(uuid);
