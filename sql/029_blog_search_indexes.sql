CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_blog_posts_title_trgm
    ON blog_posts USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status_created_at
    ON blog_posts (status, created_at DESC);
