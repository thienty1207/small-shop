use sqlx::PgPool;
use std::collections::HashSet;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::order::{AdminOrderListItem, AdminOrderQuery, Order, OrderItem, OrderItemInput},
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
    coupon_code: Option<&str>,
    coupon_type: Option<&str>,
    coupon_value: Option<i64>,
    discount_amt: i64,
    total: i64,
    items: &[OrderItemInput],
) -> Result<(Order, Vec<OrderItem>), AppError> {
    let mut tx = pool.begin().await?;

    // Insert the order
    let order = sqlx::query_as::<_, Order>(
        r#"
        INSERT INTO orders
            (order_code, user_id, customer_name, customer_email, customer_phone,
               address, note, payment_method, subtotal, shipping_fee,
               coupon_code, coupon_type, coupon_value, discount_amt, total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id, order_code, user_id, customer_name, customer_email,
                  customer_phone, address, note, payment_method, status,
                   subtotal, shipping_fee, coupon_code, coupon_type, coupon_value,
                   discount_amt, total, created_at, updated_at
        "#,
    )
    .bind(order_code)
    .bind(user_id)
    .bind(customer_name)
    .bind(customer_email)
    .bind(customer_phone)
    .bind(address)
    .bind(note)
    .bind(payment_method)
    .bind(subtotal)
    .bind(shipping_fee)
    .bind(coupon_code)
    .bind(coupon_type)
    .bind(coupon_value)
    .bind(discount_amt)
    .bind(total)
    .fetch_one(&mut *tx)
    .await?;

    // Insert all line items
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
pub async fn find_by_id(
    pool: &PgPool,
    order_id: Uuid,
) -> Result<Option<(Order, Vec<OrderItem>)>, AppError> {
    let order = sqlx::query_as::<_, Order>(
        r#"
        SELECT id, order_code, user_id, customer_name, customer_email, customer_phone,
             address, note, payment_method, status, subtotal, shipping_fee,
             coupon_code, coupon_type, coupon_value, discount_amt, total,
             created_at, updated_at
        FROM orders WHERE id = $1
        "#,
    )
    .bind(order_id)
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
pub async fn find_by_user(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Vec<crate::models::order::OrderListItem>, AppError> {
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
    let order = sqlx::query_as::<_, Order>(
        r#"
        UPDATE orders
        SET status = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING id, order_code, user_id, customer_name, customer_email,
                  customer_phone, address, note, payment_method, status,
                  subtotal, shipping_fee, coupon_code, coupon_type, coupon_value,
                  discount_amt, total, created_at, updated_at
        "#,
    )
    .bind(order_id)
    .bind(status)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Order {order_id} not found")))?;

    Ok(order)
}

fn parse_variant_ml(variant: &str) -> Option<i32> {
    let normalized = variant.trim().to_lowercase().replace(' ', "");
    if !normalized.ends_with("ml") {
        return None;
    }
    let ml = normalized.trim_end_matches("ml");
    ml.parse::<i32>().ok().filter(|v| *v > 0)
}

/// Deduct stock for all items in an order.
///
/// - If item has variant like `50ml`, deduct from `product_variants.stock`.
/// - Otherwise fallback to `products.stock` (legacy/non-variant items).
/// - Re-sync `products.stock` / `in_stock` from variants for touched products.
pub async fn deduct_stock_for_order(pool: &PgPool, order_id: Uuid) -> Result<(), AppError> {
    #[derive(sqlx::FromRow)]
    struct OrderItemStockRow {
        product_id: Option<Uuid>,
        product_name: String,
        variant: String,
        quantity: i32,
    }

    let mut tx = pool.begin().await?;

    let items = sqlx::query_as::<_, OrderItemStockRow>(
        r#"
        SELECT product_id, product_name, variant, quantity
        FROM order_items
        WHERE order_id = $1
        "#,
    )
    .bind(order_id)
    .fetch_all(&mut *tx)
    .await?;

    if items.is_empty() {
        return Err(AppError::BadRequest(format!(
            "Order {order_id} has no items"
        )));
    }

    let mut variant_product_ids: HashSet<Uuid> = HashSet::new();

    for item in items {
        let product_id = item.product_id.ok_or_else(|| {
            AppError::BadRequest(format!(
                "Order item '{}' không có product_id hợp lệ",
                item.product_name
            ))
        })?;

        if let Some(ml) = parse_variant_ml(&item.variant) {
            let variant_row = sqlx::query!(
                r#"
                SELECT id, stock
                FROM product_variants
                WHERE product_id = $1 AND ml = $2
                FOR UPDATE
                "#,
                product_id,
                ml,
            )
            .fetch_optional(&mut *tx)
            .await?;

            if let Some(v) = variant_row {
                if v.stock < item.quantity {
                    return Err(AppError::BadRequest(format!(
                        "Biến thể '{}' của sản phẩm '{}' không đủ hàng. Còn lại: {}",
                        item.variant, item.product_name, v.stock
                    )));
                }

                sqlx::query!(
                    "UPDATE product_variants SET stock = stock - $2 WHERE id = $1",
                    v.id,
                    item.quantity,
                )
                .execute(&mut *tx)
                .await?;

                variant_product_ids.insert(product_id);
                continue;
            }
        }

        let product_row = sqlx::query!(
            "SELECT stock, name FROM products WHERE id = $1 FOR UPDATE",
            product_id,
        )
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(|| {
            AppError::BadRequest(format!("Sản phẩm không tồn tại (id: {})", product_id))
        })?;

        if product_row.stock < item.quantity {
            return Err(AppError::BadRequest(format!(
                "Sản phẩm '{}' không đủ hàng. Còn lại: {} sản phẩm",
                product_row.name, product_row.stock
            )));
        }

        sqlx::query!(
            "UPDATE products SET stock = stock - $2, in_stock = (stock - $2) > 0 WHERE id = $1",
            product_id,
            item.quantity,
        )
        .execute(&mut *tx)
        .await?;
    }

    for product_id in variant_product_ids {
        sqlx::query(
            r#"
            UPDATE products SET
                stock    = (SELECT COALESCE(SUM(stock), 0) FROM product_variants WHERE product_id = $1),
                in_stock = (SELECT COALESCE(SUM(stock), 0) > 0 FROM product_variants WHERE product_id = $1)
            WHERE id = $1
            "#,
        )
        .bind(product_id)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(())
}
/// Restore product stock for all items in an order (called when order is cancelled).
pub async fn restore_stock_for_order(pool: &PgPool, order_id: Uuid) -> Result<(), AppError> {
    #[derive(sqlx::FromRow)]
    struct OrderItemStockRow {
        product_id: Option<Uuid>,
        variant: String,
        quantity: i32,
    }

    let mut tx = pool.begin().await?;

    let items = sqlx::query_as::<_, OrderItemStockRow>(
        r#"
        SELECT product_id, variant, quantity
        FROM order_items
        WHERE order_id = $1
        "#,
    )
    .bind(order_id)
    .fetch_all(&mut *tx)
    .await?;

    let mut variant_product_ids: HashSet<Uuid> = HashSet::new();

    for item in items {
        let product_id = match item.product_id {
            Some(id) => id,
            None => continue,
        };

        if let Some(ml) = parse_variant_ml(&item.variant) {
            let variant_id = sqlx::query_scalar!(
                r#"
                SELECT id
                FROM product_variants
                WHERE product_id = $1 AND ml = $2
                FOR UPDATE
                "#,
                product_id,
                ml,
            )
            .fetch_optional(&mut *tx)
            .await?;

            if let Some(v_id) = variant_id {
                sqlx::query!(
                    "UPDATE product_variants SET stock = stock + $2 WHERE id = $1",
                    v_id,
                    item.quantity,
                )
                .execute(&mut *tx)
                .await?;

                variant_product_ids.insert(product_id);
                continue;
            }
        }

        sqlx::query!(
            "UPDATE products SET stock = stock + $2, in_stock = TRUE WHERE id = $1",
            product_id,
            item.quantity,
        )
        .execute(&mut *tx)
        .await?;
    }

    for product_id in variant_product_ids {
        sqlx::query(
            r#"
            UPDATE products SET
                stock    = (SELECT COALESCE(SUM(stock), 0) FROM product_variants WHERE product_id = $1),
                in_stock = (SELECT COALESCE(SUM(stock), 0) > 0 FROM product_variants WHERE product_id = $1)
            WHERE id = $1
            "#,
        )
        .bind(product_id)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;

    Ok(())
}
