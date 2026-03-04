use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::order::{Order, OrderItem, OrderItemInput},
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

    // Insert all line items, collecting the returned rows
    let mut order_items: Vec<OrderItem> = Vec::with_capacity(items.len());
    for item in items {
        let variant = item.variant.clone().unwrap_or_default();
        let item_subtotal = item.unit_price * item.quantity as i64;

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
