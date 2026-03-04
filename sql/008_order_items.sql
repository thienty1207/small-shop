-- 008_order_items.sql
-- Line items belonging to an order (snapshot of product at purchase time)

CREATE TABLE IF NOT EXISTS order_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id    UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name  TEXT NOT NULL,    -- snapshot
    product_image TEXT NOT NULL,    -- snapshot
    variant       TEXT NOT NULL DEFAULT '',
    quantity      INT NOT NULL CHECK (quantity > 0),
    unit_price    BIGINT NOT NULL,  -- price at time of purchase
    subtotal      BIGINT NOT NULL   -- unit_price * quantity
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
