-- Migration: 001_create_users.sql
-- Creates the users table for Google OAuth authentication

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id        VARCHAR     NOT NULL UNIQUE,
    email            VARCHAR     NOT NULL UNIQUE,
    name             VARCHAR     NOT NULL,
    avatar_url       VARCHAR,
    role             VARCHAR     NOT NULL DEFAULT 'customer',

    -- Reserved for future refresh token flow
    refresh_token    VARCHAR,
    token_expires_at TIMESTAMPTZ,

    last_login_at    TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup on OAuth callback (most frequent query)
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);

-- Used when checking email uniqueness
CREATE INDEX IF NOT EXISTS idx_users_email    ON users (email);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
