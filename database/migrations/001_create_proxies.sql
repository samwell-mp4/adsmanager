-- Migration 001: Create browser_proxies table

CREATE TABLE IF NOT EXISTS browser_proxies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    username VARCHAR(255),
    password VARCHAR(255),
    type VARCHAR(20) NOT NULL DEFAULT 'http' CHECK (type IN ('http', 'https', 'socks4', 'socks5')),
    country VARCHAR(100),
    state VARCHAR(100),
    city VARCHAR(100),
    last_ip VARCHAR(64),
    last_tested_at TIMESTAMPTZ,
    latency_ms INTEGER,
    status VARCHAR(50) NOT NULL DEFAULT 'untested' CHECK (status IN ('active', 'error', 'untested')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_browser_proxies_status ON browser_proxies(status);
