-- 031_blog_reviews.sql
-- Blog interactions: heart + comment per user per post

CREATE TABLE IF NOT EXISTS blog_reviews (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blog_post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hearted      BOOLEAN NOT NULL DEFAULT TRUE,
    comment      TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (blog_post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_reviews_post_id ON blog_reviews(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_blog_reviews_user_id ON blog_reviews(user_id);
