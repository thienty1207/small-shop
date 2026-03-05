use axum::{extract::State, Extension, Json};

use crate::{
    error::AppError,
    models::admin::{AdminPublic, DashboardStats, RevenuePoint, TopProduct},
    repositories::order_repo,
    state::AppState,
};

/// GET /api/admin/dashboard
///
/// Returns real aggregated stats from the database.
pub async fn get_stats(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
) -> Result<Json<serde_json::Value>, AppError> {
    let db = &state.db;

    // ── Revenue ────────────────────────────────────────────────────────────
    let revenue_today: i64 = sqlx::query_scalar(
        r#"SELECT COALESCE(SUM(total), 0)
           FROM orders
           WHERE status = 'delivered' AND created_at >= CURRENT_DATE"#,
    )
    .fetch_one(db)
    .await?;

    let revenue_this_month: i64 = sqlx::query_scalar(
        r#"SELECT COALESCE(SUM(total), 0)
           FROM orders
           WHERE status = 'delivered'
             AND created_at >= DATE_TRUNC('month', NOW())"#,
    )
    .fetch_one(db)
    .await?;

    // ── Order counts by status ─────────────────────────────────────────────
    let orders_total:     i64 = sqlx::query_scalar("SELECT COUNT(*) FROM orders").fetch_one(db).await?;
    let orders_pending:   i64 = sqlx::query_scalar("SELECT COUNT(*) FROM orders WHERE status = 'pending'").fetch_one(db).await?;
    let orders_confirmed: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM orders WHERE status = 'confirmed'").fetch_one(db).await?;
    let orders_shipping:  i64 = sqlx::query_scalar("SELECT COUNT(*) FROM orders WHERE status = 'shipping'").fetch_one(db).await?;
    let orders_delivered: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM orders WHERE status = 'delivered'").fetch_one(db).await?;
    let orders_cancelled: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM orders WHERE status = 'cancelled'").fetch_one(db).await?;

    // ── Customers & Products ───────────────────────────────────────────────
    let customers_total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users").fetch_one(db).await?;
    let new_customers_this_month: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM users WHERE created_at >= DATE_TRUNC('month', NOW())"#,
    )
    .fetch_one(db)
    .await?;
    let products_total:  i64 = sqlx::query_scalar("SELECT COUNT(*) FROM products").fetch_one(db).await?;
    let products_out_of_stock: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM products WHERE in_stock = FALSE").fetch_one(db).await?;

    let stats = DashboardStats {
        revenue_today,
        revenue_this_month,
        orders_total,
        orders_pending,
        orders_confirmed,
        orders_shipping,
        orders_delivered,
        orders_cancelled,
        customers_total,
        new_customers_this_month,
        products_total,
        products_out_of_stock,
    };

    // ── Recent orders (last 10) ────────────────────────────────────────────
    let recent_query = crate::models::order::AdminOrderQuery {
        limit: 10,
        page: 1,
        ..Default::default()
    };
    let (recent_orders, _) = order_repo::find_all_admin(db, &recent_query).await?;

    // ── Revenue chart (last 6 months) ─────────────────────────────────────
    let revenue_chart: Vec<RevenuePoint> = sqlx::query_as::<_, RevenuePoint>(
        r#"
        SELECT
            TO_CHAR(DATE_TRUNC('month', created_at), 'MM/YYYY') AS month,
            COALESCE(SUM(total), 0)::BIGINT                     AS revenue
        FROM orders
        WHERE status = 'delivered'
          AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) ASC
        "#,
    )
    .fetch_all(db)
    .await?;

    // ── Top 5 best-selling products ────────────────────────────────────────
    let top_products: Vec<TopProduct> = sqlx::query_as::<_, TopProduct>(
        r#"
        SELECT p.id, p.name, p.image_url,
               COALESCE(SUM(oi.quantity), 0)::BIGINT  AS units_sold,
               COALESCE(SUM(oi.subtotal), 0)::BIGINT  AS revenue
        FROM products p
        JOIN order_items oi ON oi.product_id = p.id
        JOIN orders      o  ON o.id = oi.order_id
        WHERE o.status = 'delivered'
        GROUP BY p.id, p.name, p.image_url
        ORDER BY units_sold DESC
        LIMIT 5
        "#,
    )
    .fetch_all(db)
    .await?;

    Ok(Json(serde_json::json!({
        "stats":         stats,
        "recent_orders": recent_orders,
        "revenue_chart": revenue_chart,
        "top_products":  top_products,
    })))
}
