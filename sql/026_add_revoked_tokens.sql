-- 026_add_revoked_tokens.sql
-- Store server-side revoked JWT fingerprints to support immediate logout invalidation.

CREATE TABLE IF NOT EXISTS revoked_tokens (
  token_hash TEXT PRIMARY KEY,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_by_role TEXT NOT NULL,
  revoked_by_user_id UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires_at
  ON revoked_tokens (expires_at);
