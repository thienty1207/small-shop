use crate::{
    error::AppError,
    models::{
        admin::{DashboardStats, MonthlyRevenuePoint, RevenuePoint, TopProduct},
        order::AdminOrderQuery,
    },
    repositories::order_repo,
    state::AppState,
};

/// Build dashboard payload for the admin panel.
///
/// Includes:
/// - `stats`: top-level KPIs (revenue/orders/customers/products)
/// - `recent_orders`: 10 most recent orders
/// - `revenue_chart`: revenue trend for the last 6 months
/// - `top_products`: top products by units sold and revenue
pub async fn get_dashboard_payload(state: &AppState) -> Result<serde_json::Value, AppError> {
    let db = &state.db;

    let revenue_today: i64 = sqlx::query_scalar(
        r#"SELECT COALESCE(SUM(total), 0)::BIGINT
           FROM orders
           WHERE status = 'delivered' AND created_at >= CURRENT_DATE"#,
    )
    .fetch_one(db)
    .await?;

    let revenue_this_month: i64 = sqlx::query_scalar(
        r#"SELECT COALESCE(SUM(total), 0)::BIGINT
           FROM orders
           WHERE status = 'delivered'
             AND created_at >= DATE_TRUNC('month', NOW())"#,
    )
    .fetch_one(db)
    .await?;

    let orders_total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM orders")
        .fetch_one(db)
        .await?;
    let orders_pending: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM orders WHERE status = 'pending'")
            .fetch_one(db)
            .await?;
    let orders_confirmed: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM orders WHERE status = 'confirmed'")
            .fetch_one(db)
            .await?;
    let orders_shipping: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM orders WHERE status = 'shipping'")
            .fetch_one(db)
            .await?;
    let orders_delivered: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM orders WHERE status = 'delivered'")
            .fetch_one(db)
            .await?;
    let orders_cancelled: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM orders WHERE status = 'cancelled'")
            .fetch_one(db)
            .await?;

    let customers_total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
        .fetch_one(db)
        .await?;
    let new_customers_this_month: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM users WHERE created_at >= DATE_TRUNC('month', NOW())"#,
    )
    .fetch_one(db)
    .await?;
    let products_total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM products")
        .fetch_one(db)
        .await?;
    let products_out_of_stock: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM products WHERE in_stock = FALSE")
            .fetch_one(db)
            .await?;

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

    let recent_query = AdminOrderQuery {
        limit: 10,
        page: 1,
        ..Default::default()
    };
    let (recent_orders, _) = order_repo::find_all_admin(db, &recent_query).await?;

    let revenue_chart: Vec<RevenuePoint> = sqlx::query_as::<_, RevenuePoint>(
        r#"
        WITH months AS (
            SELECT generate_series(
                DATE_TRUNC('month', NOW()) - INTERVAL '5 months',
                DATE_TRUNC('month', NOW()),
                INTERVAL '1 month'
            ) AS month_start
        ), delivered AS (
            SELECT DATE_TRUNC('month', created_at) AS month_start,
                   COALESCE(SUM(total), 0)::BIGINT AS revenue
            FROM orders
            WHERE status = 'delivered'
              AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
            GROUP BY DATE_TRUNC('month', created_at)
        )
        SELECT
            TO_CHAR(months.month_start, 'MM/YYYY') AS month,
            COALESCE(delivered.revenue, 0)::BIGINT AS revenue
        FROM months
        LEFT JOIN delivered ON delivered.month_start = months.month_start
        ORDER BY months.month_start ASC
        "#,
    )
    .fetch_all(db)
    .await?;

    let monthly_revenue: Vec<MonthlyRevenuePoint> = sqlx::query_as::<_, MonthlyRevenuePoint>(
        r#"
        WITH months AS (
            SELECT generate_series(
                DATE_TRUNC('year', NOW()),
                DATE '2030-12-01',
                INTERVAL '1 month'
            )::date AS month_start
        ), delivered AS (
            SELECT DATE_TRUNC('month', created_at)::date AS month_start,
                   COALESCE(SUM(total), 0)::BIGINT       AS revenue
            FROM orders
            WHERE status = 'delivered'
              AND created_at >= DATE_TRUNC('year', NOW())
              AND created_at < DATE '2031-01-01'
            GROUP BY DATE_TRUNC('month', created_at)::date
        )
        SELECT
            EXTRACT(YEAR FROM months.month_start)::INT AS year,
            EXTRACT(MONTH FROM months.month_start)::INT AS month,
            CASE
                WHEN months.month_start > DATE_TRUNC('month', NOW())::date THEN NULL
                ELSE COALESCE(delivered.revenue, 0)::BIGINT
            END AS revenue
        FROM months
        LEFT JOIN delivered ON delivered.month_start = months.month_start
        ORDER BY months.month_start ASC
        "#,
    )
    .fetch_all(db)
    .await?;

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

    Ok(serde_json::json!({
        "stats":         stats,
        "recent_orders": recent_orders,
        "revenue_chart": revenue_chart,
        "monthly_revenue": monthly_revenue,
        "top_products":  top_products,
    }))
}
