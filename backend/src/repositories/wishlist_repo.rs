use crate::models::product::Product;
use sqlx::{PgPool, Result, Row};
use uuid::Uuid;

/// Toggle wishlist relation for a given `user_id` and `product_id`.
///
/// Returns `true` if the final state is liked, `false` if it was unliked.
pub async fn toggle_wishlist(pool: &PgPool, user_id: Uuid, product_id: Uuid) -> Result<bool> {
    let exists: Option<i32> = sqlx::query_scalar(
        r#"SELECT 1 as x FROM wishlists WHERE user_id = $1 AND product_id = $2"#,
    )
    .bind(user_id)
    .bind(product_id)
    .fetch_optional(pool)
    .await?;

    if exists.is_some() {
        sqlx::query(r#"DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2"#)
            .bind(user_id)
            .bind(product_id)
            .execute(pool)
            .await?;
        Ok(false)
    } else {
        sqlx::query(r#"INSERT INTO wishlists (user_id, product_id) VALUES ($1, $2)"#)
            .bind(user_id)
            .bind(product_id)
            .execute(pool)
            .await?;
        Ok(true)
    }
}

/// Get all products wishlisted by user, ordered by newest first.
pub async fn get_wishlist(pool: &PgPool, user_id: Uuid) -> Result<Vec<Product>> {
    sqlx::query_as::<_, Product>(
        r#"
        SELECT
            p.id,
            p.category_id,
            p.name,
            p.slug,
            p.price,
            p.original_price,
            p.image_url,
            p.images,
            p.badge,
            p.description,
            p.top_note,
            p.mid_note,
            p.base_note,
            p.care,
            p.rating::float8 AS rating,
            p.review_count,
            p.in_stock,
            p.stock,
            p.brand,
            p.concentration,
            p.created_at
        FROM products p
        JOIN wishlists w ON p.id = w.product_id
        WHERE w.user_id = $1
        ORDER BY w.created_at DESC
        "#,
    )
    .bind(user_id)
    .fetch_all(pool)
    .await
}

/// Get wishlisted `product_id` values for a user.
///
/// Useful for frontend when only liked-state checks are needed.
pub async fn get_wishlist_ids(pool: &PgPool, user_id: Uuid) -> Result<Vec<Uuid>> {
    let rows = sqlx::query(
        r#"
        SELECT product_id FROM wishlists WHERE user_id = $1
        "#,
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    let ids = rows.into_iter().map(|row| row.get("product_id")).collect();
    Ok(ids)
}
