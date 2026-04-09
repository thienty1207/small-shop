-- 033_nested_comment_replies.sql
-- Allow reply-to-reply targeting in blog comment threads.

ALTER TABLE blog_comment_replies
    ADD COLUMN IF NOT EXISTS reply_to_reply_id UUID REFERENCES blog_comment_replies(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS reply_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_blog_comment_replies_reply_to_reply
    ON blog_comment_replies(reply_to_reply_id);

CREATE INDEX IF NOT EXISTS idx_blog_comment_replies_reply_to_user
    ON blog_comment_replies(reply_to_user_id);
