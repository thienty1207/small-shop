-- Migration: 003_contact_messages
-- Purpose: Store incoming contact form submissions for audit/history

CREATE TABLE IF NOT EXISTS contact_messages (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
    email       TEXT        NOT NULL CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$'),
    phone       TEXT,
    message     TEXT        NOT NULL CHECK (char_length(message) BETWEEN 10 AND 2000),
    ip_address  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_email      ON contact_messages(email);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);
