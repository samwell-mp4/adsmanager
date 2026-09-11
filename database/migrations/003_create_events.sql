-- Migration 003: Create browser_events table

CREATE TABLE IF NOT EXISTS browser_events (
    id SERIAL PRIMARY KEY,
    profile_id INTEGER REFERENCES browser_profiles(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_browser_events_profile_id ON browser_events(profile_id);
CREATE INDEX IF NOT EXISTS idx_browser_events_type ON browser_events(type);
CREATE INDEX IF NOT EXISTS idx_browser_events_created_at ON browser_events(created_at DESC);
