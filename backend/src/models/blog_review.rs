use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct BlogReviewPublic {
    pub id: Uuid,
    pub blog_post_id: Uuid,
    pub user_id: Uuid,
    pub user_name: String,
    pub user_avatar: Option<String>,
    pub hearted: bool,
    pub comment: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct BlogHeartUserPublic {
    pub user_id: Uuid,
    pub user_name: String,
    pub user_avatar: Option<String>,
    pub hearted_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct BlogReviewAdminPublic {
    pub id: Uuid,
    pub blog_post_id: Uuid,
    pub blog_post_title: String,
    pub blog_post_slug: String,
    pub user_id: Uuid,
    pub user_name: String,
    pub user_avatar: Option<String>,
    pub hearted: bool,
    pub comment: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateBlogReviewInput {
    pub hearted: Option<bool>,
    pub comment: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
pub struct BlogReviewQuery {
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
