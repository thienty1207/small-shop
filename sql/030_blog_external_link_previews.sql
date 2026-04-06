ALTER TABLE blog_posts
    ADD COLUMN IF NOT EXISTS external_link_previews JSONB NOT NULL DEFAULT '[]'::jsonb;
