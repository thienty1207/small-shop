use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Raw database row for the `categories` table.
#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct Category {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub image_url: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// Raw database row for the `products` table.
/// `rating` is fetched as f64 by casting NUMERIC in SQL.
#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct Product {
    pub id: Uuid,
    pub category_id: Uuid,
    pub name: String,
    pub slug: String,
    pub price: i64,
    pub original_price: Option<i64>,
    pub image_url: String,
    pub images: Vec<String>,
    pub badge: Option<String>,
    pub description: Option<String>,
    pub material: Option<String>,
    pub care: Option<String>,
    pub rating: f64,
    pub review_count: i32,
    pub in_stock: bool,
    pub created_at: DateTime<Utc>,
}

/// Public-facing product response (with category included).
#[derive(Debug, Serialize)]
pub struct ProductPublic {
    pub id: Uuid,
    pub category_id: Uuid,
    pub name: String,
    pub slug: String,
    pub price: i64,
    pub original_price: Option<i64>,
    pub image_url: String,
    pub images: Vec<String>,
    pub badge: Option<String>,
    pub description: Option<String>,
    pub material: Option<String>,
    pub care: Option<String>,
    pub rating: f64,
    pub review_count: i32,
    pub in_stock: bool,
}

impl From<Product> for ProductPublic {
    fn from(p: Product) -> Self {
        Self {
            id: p.id,
            category_id: p.category_id,
            name: p.name,
            slug: p.slug,
            price: p.price,
            original_price: p.original_price,
            image_url: p.image_url,
            images: p.images,
            badge: p.badge,
            description: p.description,
            material: p.material,
            care: p.care,
            rating: p.rating,
            review_count: p.review_count,
            in_stock: p.in_stock,
        }
    }
}

/// Query parameters for listing products.
#[derive(Debug, Deserialize)]
pub struct ProductQuery {
    pub category: Option<String>,
    pub search: Option<String>,
}

// ─── Admin-only types ────────────────────────────────────────────────────────

/// Product row as returned to the admin panel (includes category name & stock).
/// Uses runtime queries (query_as::<_, AdminProduct>()) — not the macro — so
/// the `stock` column added by migration 011 doesn't break compile-time checks.
#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct AdminProduct {
    pub id:             Uuid,
    pub category_id:    Uuid,
    pub category_name:  String,
    pub name:           String,
    pub slug:           String,
    pub price:          i64,
    pub original_price: Option<i64>,
    pub image_url:      String,
    pub badge:          Option<String>,
    pub description:    Option<String>,
    pub in_stock:       bool,
    pub stock:          i32,
    pub created_at:     DateTime<Utc>,
}

/// Paginated list wrapper.
#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T: Serialize> {
    pub items:       Vec<T>,
    pub total:       i64,
    pub page:        i64,
    pub limit:       i64,
    pub total_pages: i64,
}

/// Request body for creating a product (admin only).
#[derive(Debug, Deserialize)]
pub struct CreateProductInput {
    pub category_id:    Uuid,
    pub name:           String,
    /// Auto-generated from `name` if absent.
    pub slug:           Option<String>,
    pub price:          i64,
    pub original_price: Option<i64>,
    pub image_url:      String,
    pub badge:          Option<String>,
    pub description:    Option<String>,
    pub material:       Option<String>,
    pub care:           Option<String>,
    pub in_stock:       Option<bool>,
    pub stock:          Option<i32>,
}

/// Request body for updating a product (admin only, full PUT semantics).
#[derive(Debug, Deserialize)]
pub struct UpdateProductInput {
    pub category_id:    Uuid,
    pub name:           String,
    pub slug:           String,
    pub price:          i64,
    pub original_price: Option<i64>,
    pub image_url:      String,
    pub badge:          Option<String>,
    pub description:    Option<String>,
    pub material:       Option<String>,
    pub care:           Option<String>,
    pub in_stock:       bool,
    pub stock:          i32,
}

fn default_page()  -> i64 { 1  }
fn default_limit() -> i64 { 20 }

/// Query parameters for the admin product list.
#[derive(Debug, Deserialize, Default)]
pub struct AdminProductQuery {
    pub search:      Option<String>,
    pub category_id: Option<Uuid>,
    pub in_stock:    Option<bool>,
    #[serde(default = "default_page")]
    pub page:  i64,
    #[serde(default = "default_limit")]
    pub limit: i64,
}

/// Input for creating or updating a category.
#[derive(Debug, Deserialize)]
pub struct CategoryInput {
    pub name:      String,
    pub slug:      Option<String>,
    pub image_url: Option<String>,
}
