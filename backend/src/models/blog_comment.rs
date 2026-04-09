use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct BlogCommentPublic {
    pub id: Uuid,
    pub blog_post_id: Uuid,
    pub user_id: Uuid,
    pub user_name: String,
    pub user_avatar: Option<String>,
    pub comment: String,
    pub created_at: DateTime<Utc>,
    pub likes_count: i64,
    pub replies_count: i64,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct BlogCommentReplyPublic {
    pub id: Uuid,
    pub blog_post_id: Uuid,
    pub parent_review_id: Uuid,
    pub reply_to_reply_id: Option<Uuid>,
    pub reply_to_user_id: Option<Uuid>,
    pub reply_to_user_name: Option<String>,
    pub user_id: Uuid,
    pub user_name: String,
    pub user_avatar: Option<String>,
    pub content: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCommentReplyInput {
    pub content: String,
    pub reply_to_reply_id: Option<Uuid>,
}

#[derive(Debug, Serialize)]
pub struct ToggleCommentLikeResult {
    pub comment_id: Uuid,
    pub liked: bool,
    pub likes_count: i64,
}

#[derive(Debug, Deserialize, Default)]
pub struct BlogCommentQuery {
    #[serde(default = "default_page")]
    pub page: i64,
    #[serde(default = "default_limit")]
    pub limit: i64,
}

fn default_page() -> i64 {
    1
}

fn default_limit() -> i64 {
    20
}
