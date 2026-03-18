use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::cart::{AddToCartInput, CartItem, CartItemWithProduct},
};

/// Get all cart items for a user, joined with product details.
/// Uses the variant-specific price when a variant (e.g. "100ml") is stored,
/// falling back to the product base price for variant-less items.
pub async fn get_user_cart(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Vec<CartItemWithProduct>, AppError> {
    let items = sqlx::query_as::<_, CartItemWithProduct>(
        r#"
        SELECT
            ci.id,
            ci.product_id,
            p.name      AS product_name,
            p.image_url AS product_image,
            p.slug      AS product_slug,
            COALESCE(pv.price, p.price)                   AS price,
            COALESCE(pv.original_price, p.original_price) AS original_price,
            COALESCE(pv.stock, p.stock)                   AS stock,
            ci.quantity,
            ci.variant
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        LEFT JOIN product_variants pv
            ON  pv.product_id = ci.product_id
            AND ci.variant <> ''
            AND ci.variant = CONCAT(pv.ml, 'ml')
        WHERE ci.user_id = $1
        ORDER BY ci.created_at ASC
        "#,
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    Ok(items)
}

async fn get_available_stock(
    pool: &PgPool,
    product_id: Uuid,
    variant: &str,
) -> Result<i32, AppError> {
    if variant.is_empty() {
        let stock = sqlx::query_scalar::<_, i32>("SELECT stock FROM products WHERE id = $1")
            .bind(product_id)
            .fetch_optional(pool)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("Product {product_id} not found")))?;
        return Ok(stock);
    }

    let stock = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT stock
        FROM product_variants
        WHERE product_id = $1
          AND CONCAT(ml, 'ml') = $2
        "#,
    )
    .bind(product_id)
    .bind(variant)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Variant '{variant}' not found")))?;

    Ok(stock)
}

/// Add or update a cart item (upsert on user_id + product_id + variant).
pub async fn upsert_item(
    pool: &PgPool,
    user_id: Uuid,
    input: &AddToCartInput,
) -> Result<CartItem, AppError> {
    let variant = input.variant.clone().unwrap_or_default();
    let available_stock = get_available_stock(pool, input.product_id, &variant).await?;
    let existing_quantity = sqlx::query_scalar::<_, i32>(
        r#"
        SELECT COALESCE(quantity, 0)
        FROM cart_items
        WHERE user_id = $1 AND product_id = $2 AND variant = $3
        "#,
    )
    .bind(user_id)
    .bind(input.product_id)
    .bind(&variant)
    .fetch_optional(pool)
    .await?
    .unwrap_or(0);

    let requested_total = existing_quantity + input.quantity;
    if requested_total > available_stock {
        return Err(AppError::BadRequest(format!(
            "Only {available_stock} item(s) available for {variant}"
        )));
    }

    let item = sqlx::query_as!(
        CartItem,
        r#"
        INSERT INTO cart_items (user_id, product_id, quantity, variant)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, product_id, variant)
        DO UPDATE SET
            quantity   = cart_items.quantity + EXCLUDED.quantity,
            updated_at = NOW()
        RETURNING id, user_id, product_id, quantity, variant, created_at, updated_at
        "#,
        user_id,
        input.product_id,
        input.quantity,
        variant,
    )
    .fetch_one(pool)
    .await?;

    Ok(item)
}

/// Update a specific cart item quantity while enforcing stock limits.
pub async fn update_item_quantity(
    pool: &PgPool,
    user_id: Uuid,
    item_id: Uuid,
    quantity: i32,
) -> Result<CartItem, AppError> {
    #[derive(sqlx::FromRow)]
    struct CartLineStock {
        variant: String,
        stock: i32,
    }

    let line = sqlx::query_as::<_, CartLineStock>(
        r#"
        SELECT
            ci.product_id,
            ci.variant,
            COALESCE(pv.stock, p.stock) AS stock
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        LEFT JOIN product_variants pv
            ON pv.product_id = ci.product_id
           AND ci.variant <> ''
           AND ci.variant = CONCAT(pv.ml, 'ml')
        WHERE ci.id = $1 AND ci.user_id = $2
        "#,
    )
    .bind(item_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Cart item not found".into()))?;

    if quantity > line.stock {
        return Err(AppError::BadRequest(format!(
            "Only {} item(s) available for {}",
            line.stock,
            if line.variant.is_empty() {
                "this product".to_string()
            } else {
                line.variant.clone()
            }
        )));
    }

    let item = sqlx::query_as!(
        CartItem,
        r#"
        UPDATE cart_items
        SET quantity = $3, updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING id, user_id, product_id, quantity, variant, created_at, updated_at
        "#,
        item_id,
        user_id,
        quantity,
    )
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Cart item not found".into()))?;

    Ok(item)
}

/// Remove a specific cart item by its ID (only if it belongs to the user).
pub async fn remove_item(pool: &PgPool, user_id: Uuid, item_id: Uuid) -> Result<bool, AppError> {
    let result = sqlx::query!(
        "DELETE FROM cart_items WHERE id = $1 AND user_id = $2",
        item_id,
        user_id,
    )
    .execute(pool)
    .await?;

    Ok(result.rows_affected() > 0)
}

/// Clear the entire cart for a user (called after successful order placement).
pub async fn clear_cart(pool: &PgPool, user_id: Uuid) -> Result<(), AppError> {
    sqlx::query!("DELETE FROM cart_items WHERE user_id = $1", user_id)
        .execute(pool)
        .await?;
    Ok(())
}
