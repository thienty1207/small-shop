use chrono::{DateTime, Utc};
use serde::Serialize;

use crate::{error::AppError, state::AppState};

/// Export row model for orders.
///
/// Mapped directly from `fetch_orders` query output for CSV/Excel rendering in handlers.
#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct ExportOrderRow {
    pub order_code: String,
    pub customer_name: String,
    pub customer_email: String,
    pub customer_phone: String,
    pub address: String,
    pub payment_method: String,
    pub status: String,
    pub subtotal: i64,
    pub shipping_fee: i64,
    pub total: i64,
    pub created_at: DateTime<Utc>,
}

/// Export row model for products.
///
/// Used by admin product reports, including pricing/stock/rating/created-at fields.
#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct ExportProductRow {
    pub name: String,
    pub slug: String,
    pub category: String,
    pub price: i64,
    pub original_price: Option<i64>,
    pub stock: i32,
    pub badge: Option<String>,
    pub brand: Option<String>,
    pub rating: f64,
    pub review_count: i32,
    pub in_stock: bool,
    pub created_at: DateTime<Utc>,
}

/// Parse a datetime query parameter into `DateTime<Utc>`.
///
/// Returns `None` if input is empty or invalid, so date filters remain optional.
fn parse_dt(value: Option<&str>) -> Option<DateTime<Utc>> {
    value.and_then(|s| s.parse::<DateTime<Utc>>().ok())
}

/// Fetch order rows for export using `status`/`from`/`to` filters.
pub async fn fetch_orders(
    state: &AppState,
    status_filter: Option<&str>,
    from_filter: Option<&str>,
    to_filter: Option<&str>,
) -> Result<Vec<ExportOrderRow>, AppError> {
    let from = parse_dt(from_filter);
    let to = parse_dt(to_filter);

    let rows = sqlx::query_as::<_, ExportOrderRow>(
        r#"
        SELECT o.order_code, o.customer_name, o.customer_email, o.customer_phone,
               o.address, o.payment_method, o.status, o.subtotal, o.shipping_fee,
               o.total, o.created_at
        FROM orders o
        WHERE ($1::TEXT IS NULL OR o.status = $1)
          AND ($2::TIMESTAMPTZ IS NULL OR o.created_at >= $2::TIMESTAMPTZ)
          AND ($3::TIMESTAMPTZ IS NULL OR o.created_at <= $3::TIMESTAMPTZ)
        ORDER BY o.created_at DESC
        "#,
    )
    .bind(status_filter)
    .bind(from)
    .bind(to)
    .fetch_all(&state.db)
    .await?;

    Ok(rows)
}

/// Fetch product rows for export using created-at date range filters.
pub async fn fetch_products(
    state: &AppState,
    from_filter: Option<&str>,
    to_filter: Option<&str>,
) -> Result<Vec<ExportProductRow>, AppError> {
    let from = parse_dt(from_filter);
    let to = parse_dt(to_filter);

    let rows = sqlx::query_as::<_, ExportProductRow>(
        r#"
        SELECT p.name, p.slug, COALESCE(c.name, '') AS category, p.price, p.original_price,
               p.stock, p.badge, p.brand, p.rating::FLOAT8 AS rating, p.review_count, p.in_stock,
               p.created_at
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE ($1::TIMESTAMPTZ IS NULL OR p.created_at >= $1::TIMESTAMPTZ)
          AND ($2::TIMESTAMPTZ IS NULL OR p.created_at <= $2::TIMESTAMPTZ)
        ORDER BY p.created_at DESC
        "#,
    )
    .bind(from)
    .bind(to)
    .fetch_all(&state.db)
    .await?;

    Ok(rows)
}
