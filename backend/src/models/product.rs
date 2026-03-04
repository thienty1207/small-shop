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
