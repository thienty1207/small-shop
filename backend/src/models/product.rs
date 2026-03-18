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

/// A single size variant of a product (e.g. 75ml at 2,500,000 VND).
#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct ProductVariant {
    pub id: Uuid,
    pub product_id: Uuid,
    pub ml: i32,
    pub price: i64,
    pub original_price: Option<i64>,
    pub stock: i32,
    pub is_default: bool,
    pub created_at: DateTime<Utc>,
}

/// Raw database row for the `products` table.
#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct Product {
    pub id: Uuid,
    pub category_id: Uuid,
    pub name: String,
    pub slug: String,
    // Denormalized cheapest-variant price kept for list/search queries.
    pub price: i64,
    pub original_price: Option<i64>,
    pub image_url: String,
    pub images: Vec<String>,
    pub badge: Option<String>,
    pub description: Option<String>,
    pub top_note: Option<String>,
    pub mid_note: Option<String>,
    pub base_note: Option<String>,
    pub care: Option<String>,
    pub rating: f64,
    pub review_count: i32,
    pub in_stock: bool,
    pub stock: i32,
    // Perfume-specific
    pub brand: Option<String>,
    pub concentration: Option<String>,
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
    pub top_note: Option<String>,
    pub mid_note: Option<String>,
    pub base_note: Option<String>,
    pub care: Option<String>,
    pub rating: f64,
    pub review_count: i32,
    pub in_stock: bool,
    pub stock: i32,
    pub brand: Option<String>,
    pub concentration: Option<String>,
    /// All ML variants sorted ascending by ml.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub variants: Vec<ProductVariant>,
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
            top_note: p.top_note,
            mid_note: p.mid_note,
            base_note: p.base_note,
            care: p.care,
            rating: p.rating,
            review_count: p.review_count,
            in_stock: p.in_stock,
            stock: p.stock,
            brand: p.brand,
            concentration: p.concentration,
            variants: vec![], // populated by handler when fetching single product
        }
    }
}

/// Query parameters for listing products.
#[derive(Debug, Deserialize)]
pub struct ProductQuery {
    pub category: Option<String>,
    pub search: Option<String>,
    /// Allowed: newest (default), price_asc, price_desc, best_selling
    pub sort: Option<String>,
    /// Filter by badge value (e.g. "Mới", "Nổi Bật", "Giảm Giá")
    pub badge: Option<String>,
    #[serde(default = "default_client_page")]
    pub page: i64,
    #[serde(default = "default_client_limit")]
    pub limit: i64,
}

fn default_client_page() -> i64 {
    1
}
fn default_client_limit() -> i64 {
    12
}

// ─── Admin-only types ────────────────────────────────────────────────────────

/// Product row as returned to the admin panel (includes category name & stock).
#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct AdminProduct {
    pub id: Uuid,
    pub category_id: Uuid,
    pub category_name: String,
    pub name: String,
    pub slug: String,
    pub price: i64,
    pub original_price: Option<i64>,
    pub image_url: String,
    pub images: Vec<String>,
    pub badge: Option<String>,
    pub description: Option<String>,
    pub top_note: Option<String>,
    pub mid_note: Option<String>,
    pub base_note: Option<String>,
    pub care: Option<String>,
    pub in_stock: bool,
    pub stock: i32,
    pub brand: Option<String>,
    pub concentration: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// Inventory row for the admin stock management page.
#[derive(Debug, Serialize)]
pub struct InventoryRow {
    pub variant_id: Uuid,
    pub product_id: Uuid,
    pub product_name: String,
    pub brand: Option<String>,
    pub ml: i32,
    pub price: i64,
    pub original_price: Option<i64>,
    pub stock: i32,
}

/// Paginated list wrapper.
#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T: Serialize> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
    pub total_pages: i64,
}

/// Request body for creating a product (admin only).
#[derive(Debug, Deserialize)]
pub struct CreateProductInput {
    pub category_id: Uuid,
    pub name: String,
    /// Auto-generated from `name` if absent.
    pub slug: Option<String>,
    /// Fallback price for listing (auto-computed from min variant price if variants provided).
    pub price: Option<i64>,
    pub original_price: Option<i64>,
    pub image_url: String,
    /// Up to 3 extra gallery images.
    pub images: Option<Vec<String>>,
    pub badge: Option<String>,
    pub description: Option<String>,
    pub top_note: Option<String>,
    pub mid_note: Option<String>,
    pub base_note: Option<String>,
    pub care: Option<String>,
    pub in_stock: Option<bool>,
    pub stock: Option<i32>,
    pub brand: Option<String>,
    pub concentration: Option<String>,
    /// ML variants. If provided, product.price is set to min(variant prices).
    #[serde(default)]
    pub variants: Vec<VariantInput>,
}

/// Request body for updating a product (admin only, full PUT semantics).
#[derive(Debug, Deserialize)]
pub struct UpdateProductInput {
    pub category_id: Uuid,
    pub name: String,
    pub slug: String,
    pub price: i64,
    pub original_price: Option<i64>,
    pub image_url: String,
    /// Gallery images (up to 3). Empty vec clears the gallery.
    #[serde(default)]
    pub images: Vec<String>,
    pub badge: Option<String>,
    pub description: Option<String>,
    pub top_note: Option<String>,
    pub mid_note: Option<String>,
    pub base_note: Option<String>,
    pub care: Option<String>,
    pub in_stock: bool,
    pub stock: i32,
    pub brand: Option<String>,
    pub concentration: Option<String>,
    #[serde(default)]
    pub variants: Vec<VariantInput>,
}

/// A variant entry in create/update product requests.
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct VariantInput {
    pub ml: i32,
    pub price: i64,
    pub original_price: Option<i64>,
    pub stock: i32,
    #[serde(default)]
    pub is_default: bool,
}

/// Payload to patch a single variant's stock level.
#[derive(Debug, Deserialize)]
pub struct UpdateStockInput {
    pub stock: i32,
}

fn default_page() -> i64 {
    1
}
fn default_limit() -> i64 {
    20
}

/// Query parameters for the admin product list.
#[derive(Debug, Deserialize, Default)]
pub struct AdminProductQuery {
    pub search: Option<String>,
    pub category_id: Option<Uuid>,
    pub in_stock: Option<bool>,
    #[serde(default = "default_page")]
    pub page: i64,
    #[serde(default = "default_limit")]
    pub limit: i64,
}

/// Input for creating or updating a category.
#[derive(Debug, Deserialize)]
pub struct CategoryInput {
    pub name: String,
    pub slug: Option<String>,
    pub image_url: Option<String>,
}
