-- 016_product_variants.sql
-- Add perfume-specific fields to products and create per-variant pricing + stock

-- 1. Fragrance metadata on products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS brand         TEXT,
  ADD COLUMN IF NOT EXISTS concentration TEXT;  -- EDP, EDT, Parfum, EDC, EDP Intense

-- 2. Per-variant (ml size) pricing and inventory
CREATE TABLE IF NOT EXISTS product_variants (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID    NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ml             INT     NOT NULL CHECK (ml > 0),        -- e.g. 75, 125, 200
  price          BIGINT  NOT NULL CHECK (price >= 0),    -- VND
  original_price BIGINT  CHECK (original_price >= 0),   -- NULL = no discount
  stock          INT     NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_default     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, ml)
);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);

-- Ensure only one default per product (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_default
  ON product_variants(product_id) WHERE is_default = TRUE;

-- 3. Extend order_items to reference the variant that was purchased
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS variant_id    UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_label TEXT NOT NULL DEFAULT '';

-- Migrate existing variant text into the new label column
UPDATE order_items SET variant_label = variant WHERE variant_label = '';

CREATE INDEX IF NOT EXISTS idx_order_items_variant ON order_items(variant_id);
