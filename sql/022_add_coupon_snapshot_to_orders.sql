-- 022_add_coupon_snapshot_to_orders.sql
-- Store coupon snapshot data on each order for audit/detail display.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS coupon_type TEXT,
  ADD COLUMN IF NOT EXISTS coupon_value BIGINT,
  ADD COLUMN IF NOT EXISTS discount_amt BIGINT NOT NULL DEFAULT 0;
