-- 034_blog_featured_products.sql
-- Add featured product slugs so blog posts can drive product conversion.

ALTER TABLE blog_posts
    ADD COLUMN IF NOT EXISTS featured_product_slugs TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_blog_posts_featured_product_slugs
    ON blog_posts USING GIN (featured_product_slugs);
