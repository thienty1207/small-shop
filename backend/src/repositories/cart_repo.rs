use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::cart::{AddToCartInput, CartItem, CartItemWithProduct},
};

/// Get all cart items for a user, joined with product details.
pub async fn get_user_cart(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Vec<CartItemWithProduct>, AppError> {
    let items = sqlx::query_as!(
        CartItemWithProduct,
        r#"
        SELECT
            ci.id,
            ci.product_id,
            p.name    AS product_name,
            p.image_url AS product_image,
            p.slug    AS product_slug,
            p.price,
            p.original_price,
            ci.quantity,
            ci.variant
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        WHERE ci.user_id = $1
        ORDER BY ci.created_at ASC
        "#,
        user_id,
    )
    .fetch_all(pool)
    .await?;

    Ok(items)
}

/// Add or update a cart item (upsert on user_id + product_id + variant).
pub async fn upsert_item(
    pool: &PgPool,
    user_id: Uuid,
    input: &AddToCartInput,
) -> Result<CartItem, AppError> {
    let variant = input.variant.clone().unwrap_or_default();

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

/// Remove a specific cart item by its ID (only if it belongs to the user).
pub async fn remove_item(
    pool: &PgPool,
    user_id: Uuid,
    item_id: Uuid,
) -> Result<bool, AppError> {
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
