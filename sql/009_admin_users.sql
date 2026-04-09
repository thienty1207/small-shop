-- Migration: Create admin_users table
-- Admin accounts are completely separate from regular (OAuth) users.
-- Credentials are seeded at application startup via ADMIN_USERNAME / ADMIN_PASSWORD env vars.

CREATE TABLE IF NOT EXISTS admin_users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
