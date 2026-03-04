-- 007_orders.sql
-- Orders placed by customers

CREATE TABLE IF NOT EXISTS orders (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code     TEXT NOT NULL UNIQUE,   -- e.g. "HS-20260304-ABCD"
    user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    -- Customer info (snapshot at order time)
    customer_name  TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    address        TEXT NOT NULL,
    note           TEXT,
    -- Payment
    payment_method TEXT NOT NULL DEFAULT 'cod' CHECK (payment_method IN ('cod', 'bank_transfer', 'wallet')),
    -- Status
    status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipping', 'delivered', 'cancelled')),
    -- Totals (in VND)
    subtotal       BIGINT NOT NULL,
    shipping_fee   BIGINT NOT NULL DEFAULT 30000,
    total          BIGINT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id    ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_code ON orders(order_code);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
