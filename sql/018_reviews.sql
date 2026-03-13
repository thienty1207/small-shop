-- 018_reviews.sql
-- Product reviews: users can review products they have purchased.

CREATE TABLE IF NOT EXISTS reviews (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, user_id)   -- one review per user per product
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id    ON reviews(user_id);

-- Keep products.rating / review_count in sync automatically
CREATE OR REPLACE FUNCTION refresh_product_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE products
    SET
        rating       = COALESCE((SELECT AVG(rating)::FLOAT8 FROM reviews WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)), 0),
        review_count = (SELECT COUNT(*)             FROM reviews WHERE product_id = COALESCE(NEW.product_id, OLD.product_id))
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_product_rating ON reviews;
CREATE TRIGGER trg_refresh_product_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION refresh_product_rating();
