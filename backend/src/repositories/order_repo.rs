use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::order::{
        AdminOrderListItem, AdminOrderQuery, Order, OrderItem, OrderItemInput,
    },
};

/// Insert a new order row and its line items in a single transaction.
/// Returns the created `(Order, Vec<OrderItem>)` — no extra round-trip needed.
pub async fn create_order(
    pool: &PgPool,
    user_id: Option<Uuid>,
    order_code: &str,
    customer_name: &str,
    customer_email: &str,
    customer_phone: &str,
    address: &str,
    note: Option<&str>,
    payment_method: &str,
    subtotal: i64,
    shipping_fee: i64,
    total: i64,
    items: &[OrderItemInput],
) -> Result<(Order, Vec<OrderItem>), AppError> {
    let mut tx = pool.begin().await?;

    // Insert the order
    let order = sqlx::query_as!(
        Order,
        r#"
        INSERT INTO orders
            (order_code, user_id, customer_name, customer_email, customer_phone,
             address, note, payment_method, subtotal, shipping_fee, total)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, order_code, user_id, customer_name, customer_email,
                  customer_phone, address, note, payment_method, status,
                  subtotal, shipping_fee, total, created_at, updated_at
        "#,
        order_code,
        user_id,
        customer_name,
        customer_email,
        customer_phone,
        address,
        note,
        payment_method,
        subtotal,
        shipping_fee,
        total,
    )
    .fetch_one(&mut *tx)
    .await?;

    // Insert all line items + deduct stock atomically
    let mut order_items: Vec<OrderItem> = Vec::with_capacity(items.len());
    for item in items {
        let variant      = item.variant.clone().unwrap_or_default();
        let item_subtotal = item.unit_price * item.quantity as i64;

        // Check & deduct stock (SELECT FOR UPDATE prevents race conditions)
        let stock_row = sqlx::query!(
            "SELECT stock, name FROM products WHERE id = $1 FOR UPDATE",
            item.product_id,
        )
        .fetch_optional(&mut *tx)
        .await?;

        match stock_row {
            None => {
                return Err(AppError::BadRequest(format!(
                    "Sản phẩm không tồn tại (id: {})", item.product_id
                )));
            }
            Some(r) if r.stock < item.quantity => {
                return Err(AppError::BadRequest(format!(
                    "Sản phẩm '{}' không đủ hàng. Còn lại: {} sản phẩm",
                    r.name, r.stock
                )));
            }
            Some(_) => {
                sqlx::query!(
                    "UPDATE products SET stock = stock - $2 WHERE id = $1",
                    item.product_id,
                    item.quantity as i32,
                )
                .execute(&mut *tx)
                .await?;
            }
        }

        let order_item = sqlx::query_as!(
            OrderItem,
            r#"
            INSERT INTO order_items
                (order_id, product_id, product_name, product_image, variant, quantity, unit_price, subtotal)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, order_id, product_id, product_name, product_image, variant, quantity, unit_price, subtotal
            "#,
            order.id,
            item.product_id,
            item.product_name,
            item.product_image,
            variant,
            item.quantity,
            item.unit_price,
            item_subtotal,
        )
        .fetch_one(&mut *tx)
        .await?;

        order_items.push(order_item);
    }

    tx.commit().await?;

    Ok((order, order_items))
}

/// Fetch an order with its items by order ID.
pub async fn find_by_id(pool: &PgPool, order_id: Uuid) -> Result<Option<(Order, Vec<OrderItem>)>, AppError> {
    let order = sqlx::query_as!(
        Order,
        r#"
        SELECT id, order_code, user_id, customer_name, customer_email, customer_phone,
               address, note, payment_method, status, subtotal, shipping_fee, total,
               created_at, updated_at
        FROM orders WHERE id = $1
        "#,
        order_id,
    )
    .fetch_optional(pool)
    .await?;

    match order {
        None => Ok(None),
        Some(o) => {
            let items = sqlx::query_as!(
                OrderItem,
                r#"
                SELECT id, order_id, product_id, product_name, product_image,
                       variant, quantity, unit_price, subtotal
                FROM order_items WHERE order_id = $1
                "#,
                o.id,
            )
            .fetch_all(pool)
            .await?;
            Ok(Some((o, items)))
        }
    }
}

/// Fetch orders placed by a specific user, with item count per order.
pub async fn find_by_user(pool: &PgPool, user_id: Uuid) -> Result<Vec<crate::models::order::OrderListItem>, AppError> {
    let orders = sqlx::query_as!(
        crate::models::order::OrderListItem,
        r#"
        SELECT o.id, o.order_code, o.status, o.total, o.created_at,
               COUNT(oi.id) AS "items_count!: i64"
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.user_id = $1
        GROUP BY o.id
        ORDER BY o.created_at DESC
        "#,
        user_id,
    )
    .fetch_all(pool)
    .await?;

    Ok(orders)
}

// ─── Admin order functions ───────────────────────────────────────────────────

/// Paginated admin order list with optional status and search filters.
pub async fn find_all_admin(
    pool: &PgPool,
    query: &AdminOrderQuery,
) -> Result<(Vec<AdminOrderListItem>, i64), AppError> {
    let offset = (query.page - 1) * query.limit;

    let items = sqlx::query_as::<_, AdminOrderListItem>(
        r#"
        SELECT o.id, o.order_code, o.customer_name, o.customer_email,
               o.customer_phone, o.status, o.payment_method, o.total,
               COUNT(oi.id) AS items_count,
               o.created_at
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE ($1::TEXT IS NULL OR o.status = $1)
          AND ($2::TEXT IS NULL
               OR o.order_code    ILIKE '%' || $2 || '%'
               OR o.customer_name ILIKE '%' || $2 || '%'
               OR o.customer_email ILIKE '%' || $2 || '%')
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(query.status.as_deref())
    .bind(query.search.as_deref())
    .bind(query.limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let total: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*) FROM orders o
        WHERE ($1::TEXT IS NULL OR o.status = $1)
          AND ($2::TEXT IS NULL
               OR o.order_code    ILIKE '%' || $2 || '%'
               OR o.customer_name ILIKE '%' || $2 || '%'
               OR o.customer_email ILIKE '%' || $2 || '%')
        "#,
    )
    .bind(query.status.as_deref())
    .bind(query.search.as_deref())
    .fetch_one(pool)
    .await?;

    Ok((items, total))
}

/// Update order status.  Returns the updated Order row.
pub async fn update_order_status(
    pool: &PgPool,
    order_id: Uuid,
    status: &str,
) -> Result<Order, AppError> {
    let order = sqlx::query_as!(
        Order,
        r#"
        UPDATE orders
        SET status = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING id, order_code, user_id, customer_name, customer_email,
                  customer_phone, address, note, payment_method, status,
                  subtotal, shipping_fee, total, created_at, updated_at
        "#,
        order_id,
        status,
    )
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Order {order_id} not found")))?;

    Ok(order)
}
/// Restore product stock for all items in an order (called when order is cancelled).
/// Uses UPDATE...FROM syntax to do it in a single query.
pub async fn restore_stock_for_order(pool: &PgPool, order_id: Uuid) -> Result<(), AppError> {
    sqlx::query(
        r#"
        UPDATE products
        SET stock = products.stock + oi.quantity
        FROM order_items oi
        WHERE oi.order_id = $1 AND oi.product_id = products.id
        "#,
    )
    .bind(order_id)
    .execute(pool)
    .await?;

    Ok(())
}