CREATE TABLE IF NOT EXISTS blog_tags (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_post_tags (
    post_id      UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    tag_id       UUID NOT NULL REFERENCES blog_tags(id) ON DELETE RESTRICT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, tag_id)
);

ALTER TABLE blog_posts
    ADD COLUMN IF NOT EXISTS primary_tag_id UUID REFERENCES blog_tags(id) ON DELETE SET NULL;

WITH raw_tags AS (
    SELECT trim(tag_name) AS tag_name
    FROM blog_posts bp
    CROSS JOIN LATERAL unnest(COALESCE(bp.tags, ARRAY[]::TEXT[])) AS tag_name
),
normalized_tags AS (
    SELECT DISTINCT ON (lower(tag_name))
        tag_name,
        CASE
            WHEN trim(both '-' FROM regexp_replace(lower(tag_name), '[^a-z0-9]+', '-', 'g')) = ''
                THEN 'tag-' || substr(md5(lower(tag_name)), 1, 8)
            ELSE trim(both '-' FROM regexp_replace(lower(tag_name), '[^a-z0-9]+', '-', 'g'))
                 || '-' || substr(md5(lower(tag_name)), 1, 6)
        END AS slug
    FROM raw_tags
    WHERE tag_name <> ''
    ORDER BY lower(tag_name), tag_name
)
INSERT INTO blog_tags (name, slug)
SELECT tag_name, slug
FROM normalized_tags
ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_post_tags (post_id, tag_id)
SELECT bp.id, bt.id
FROM blog_posts bp
CROSS JOIN LATERAL unnest(COALESCE(bp.tags, ARRAY[]::TEXT[])) AS tag_name
JOIN blog_tags bt ON lower(bt.name) = lower(trim(tag_name))
WHERE trim(tag_name) <> ''
ON CONFLICT (post_id, tag_id) DO NOTHING;

WITH first_tags AS (
    SELECT bp.id AS post_id, lower(trim(bp.tags[1])) AS first_tag_name
    FROM blog_posts bp
    WHERE COALESCE(array_length(bp.tags, 1), 0) > 0
)
UPDATE blog_posts bp
SET primary_tag_id = bt.id
FROM first_tags ft
JOIN blog_tags bt ON lower(bt.name) = ft.first_tag_name
WHERE bp.id = ft.post_id
  AND bp.primary_tag_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_blog_tags_name_ci
    ON blog_tags (lower(name));

CREATE INDEX IF NOT EXISTS idx_blog_tags_slug
    ON blog_tags (slug);

CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag_id
    ON blog_post_tags (tag_id);

CREATE INDEX IF NOT EXISTS idx_blog_posts_primary_tag_published
    ON blog_posts (primary_tag_id, published_at DESC);
