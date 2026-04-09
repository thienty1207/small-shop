-- 019_coupons.sql
-- Discount coupons / vouchers.

CREATE TABLE IF NOT EXISTS coupons (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        TEXT NOT NULL UNIQUE,
    type        TEXT NOT NULL CHECK (type IN ('percent', 'fixed')),
    value       BIGINT NOT NULL CHECK (value > 0),   -- percent: 0-100, fixed: VND amount
    min_order   BIGINT NOT NULL DEFAULT 0,            -- minimum order total to apply
    max_uses    INT,                                  -- NULL = unlimited
    used_count  INT NOT NULL DEFAULT 0,
    expires_at  TIMESTAMPTZ,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
