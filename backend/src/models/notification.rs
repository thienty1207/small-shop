use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct UserNotificationPublic {
    pub id: Uuid,
    pub r#type: String,
    pub title: String,
    pub message: String,
    pub related_type: Option<String>,
    pub related_id: Option<Uuid>,
    pub data_json: Value,
    pub is_read: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct SystemAnnouncementPublic {
    pub id: Uuid,
    pub title: String,
    pub message: String,
    pub created_by_admin_id: Uuid,
    pub created_by_admin_name: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Default)]
pub struct NotificationQuery {
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

#[derive(Debug, Deserialize)]
pub struct CreateSystemAnnouncementInput {
    pub title: String,
    pub message: String,
}
