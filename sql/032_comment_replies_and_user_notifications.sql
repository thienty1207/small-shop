-- 032_comment_replies_and_user_notifications.sql
-- Adds: reply comments, comment likes, user notifications, admin announcements

CREATE TABLE IF NOT EXISTS blog_comment_replies (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blog_post_id     UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    parent_review_id UUID NOT NULL REFERENCES blog_reviews(id) ON DELETE CASCADE,
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content          TEXT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_comment_replies_parent ON blog_comment_replies(parent_review_id);
CREATE INDEX IF NOT EXISTS idx_blog_comment_replies_post ON blog_comment_replies(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_blog_comment_replies_user ON blog_comment_replies(user_id);

CREATE TABLE IF NOT EXISTS blog_comment_likes (
    comment_id  UUID NOT NULL REFERENCES blog_reviews(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_comment_likes_user ON blog_comment_likes(user_id);

CREATE TABLE IF NOT EXISTS user_notifications (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type          TEXT NOT NULL,
    title         TEXT NOT NULL,
    message       TEXT NOT NULL,
    related_type  TEXT,
    related_id    UUID,
    data_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created ON user_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread ON user_notifications(user_id, is_read);

CREATE TABLE IF NOT EXISTS system_announcements (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title               TEXT NOT NULL,
    message             TEXT NOT NULL,
    created_by_admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_announcements_created ON system_announcements(created_at DESC);
