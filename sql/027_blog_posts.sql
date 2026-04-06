-- 027_blog_posts.sql
-- Blog posts with rich content, tags, and YouTube links.

CREATE TABLE IF NOT EXISTS blog_posts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    excerpt         TEXT,
    content_html    TEXT,
    content_delta   TEXT,
    cover_image_url TEXT,
    tags            TEXT[] NOT NULL DEFAULT '{}',
    youtube_urls    TEXT[] NOT NULL DEFAULT '{}',
    seo_title       TEXT,
    seo_description TEXT,
    status          TEXT NOT NULL CHECK (status IN ('draft', 'published')),
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published_at
    ON blog_posts(status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at
    ON blog_posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blog_posts_tags
    ON blog_posts USING GIN(tags);
