use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ExternalLinkPreview {
    pub url: String,
    pub title: String,
    pub description: Option<String>,
    pub image_url: Option<String>,
    pub site_name: Option<String>,
    pub domain: String,
}

#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct BlogPostRecord {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
    pub excerpt: Option<String>,
    pub content_html: Option<String>,
    pub content_delta: Option<String>,
    pub cover_image_url: Option<String>,
    pub youtube_urls: Vec<String>,
    pub external_link_previews: serde_json::Value,
    pub seo_title: Option<String>,
    pub seo_description: Option<String>,
    pub status: String,
    pub primary_tag_id: Option<Uuid>,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct BlogTagRecord {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BlogTagSummary {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
}

impl From<BlogTagRecord> for BlogTagSummary {
    fn from(tag: BlogTagRecord) -> Self {
        Self {
            id: tag.id,
            name: tag.name,
            slug: tag.slug,
        }
    }
}

#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct AdminBlogTag {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub posts_count: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct PublicBlogTag {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub posts_count: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct RelatedBlogPost {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
    pub excerpt: Option<String>,
    pub cover_image_url: Option<String>,
    pub published_at: Option<DateTime<Utc>>,
    pub primary_tag: Option<BlogTagSummary>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BlogPostPublic {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
    pub excerpt: Option<String>,
    pub content_html: String,
    pub cover_image_url: Option<String>,
    pub tags: Vec<BlogTagSummary>,
    pub primary_tag: Option<BlogTagSummary>,
    pub youtube_urls: Vec<String>,
    pub external_link_previews: Vec<ExternalLinkPreview>,
    pub seo_title: Option<String>,
    pub seo_description: Option<String>,
    pub status: String,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub recommended_posts: Vec<RelatedBlogPost>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AdminBlogPost {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
    pub excerpt: Option<String>,
    pub content_html: String,
    pub content_delta: Option<serde_json::Value>,
    pub cover_image_url: Option<String>,
    pub tags: Vec<BlogTagSummary>,
    pub primary_tag: Option<BlogTagSummary>,
    pub youtube_urls: Vec<String>,
    pub external_link_previews: Vec<ExternalLinkPreview>,
    pub seo_title: Option<String>,
    pub seo_description: Option<String>,
    pub status: String,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct BlogQuery {
    #[serde(default = "default_client_page")]
    pub page: i64,
    #[serde(default = "default_client_limit")]
    pub limit: i64,
    pub tag: Option<String>,
    pub search: Option<String>,
}

fn default_client_page() -> i64 {
    1
}

fn default_client_limit() -> i64 {
    12
}

#[derive(Debug, Deserialize, Default)]
pub struct AdminBlogQuery {
    pub search: Option<String>,
    pub status: Option<String>,
    #[serde(default = "default_admin_page")]
    pub page: i64,
    #[serde(default = "default_admin_limit")]
    pub limit: i64,
}

fn default_admin_page() -> i64 {
    1
}

fn default_admin_limit() -> i64 {
    20
}

#[derive(Debug, Deserialize)]
pub struct CreateBlogPostInput {
    pub title: String,
    pub slug: Option<String>,
    pub excerpt: Option<String>,
    pub content_html: Option<String>,
    pub content_delta: Option<serde_json::Value>,
    pub cover_image_url: Option<String>,
    pub tags: Option<Vec<String>>,
    #[serde(default)]
    pub tag_ids: Vec<Uuid>,
    pub primary_tag_id: Option<Uuid>,
    #[serde(default)]
    pub youtube_urls: Vec<String>,
    pub seo_title: Option<String>,
    pub seo_description: Option<String>,
    pub status: String,
    pub published_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBlogPostInput {
    pub title: String,
    pub slug: String,
    pub excerpt: Option<String>,
    pub content_html: Option<String>,
    pub content_delta: Option<serde_json::Value>,
    pub cover_image_url: Option<String>,
    pub tags: Option<Vec<String>>,
    #[serde(default)]
    pub tag_ids: Vec<Uuid>,
    pub primary_tag_id: Option<Uuid>,
    #[serde(default)]
    pub youtube_urls: Vec<String>,
    pub seo_title: Option<String>,
    pub seo_description: Option<String>,
    pub status: String,
    pub published_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct BlogTagInput {
    pub name: String,
    pub slug: Option<String>,
}
