use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::review::{CreateReviewInput, ReviewPublic, ReviewQuery},
};

/// Fetch paginated reviews for a product, enriched with user info.
pub async fn find_by_product(
    pool: &PgPool,
    product_id: Uuid,
    query: &ReviewQuery,
) -> Result<(Vec<ReviewPublic>, i64), AppError> {
    let offset = (query.page - 1) * query.limit;

    let rows = sqlx::query_as::<_, ReviewPublic>(
        r#"
        SELECT r.id, r.product_id, r.user_id,
               u.name  AS user_name,
               u.avatar_url AS user_avatar,
               r.rating, r.comment, r.created_at
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        WHERE r.product_id = $1
        ORDER BY r.created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(product_id)
    .bind(query.limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM reviews WHERE product_id = $1")
        .bind(product_id)
        .fetch_one(pool)
        .await?;

    Ok((rows, total))
}

/// Check whether user has purchased and received the product.
pub async fn has_purchased(
    pool: &PgPool,
    user_id: Uuid,
    product_id: Uuid,
) -> Result<bool, AppError> {
    let count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.user_id    = $1
          AND oi.product_id = $2
          AND o.status      = 'delivered'
        "#,
    )
    .bind(user_id)
    .bind(product_id)
    .fetch_one(pool)
    .await?;
    Ok(count > 0)
}

/// Check whether user already reviewed this product.
pub async fn find_by_user_product(
    pool: &PgPool,
    user_id: Uuid,
    product_id: Uuid,
) -> Result<Option<ReviewPublic>, AppError> {
    let row = sqlx::query_as::<_, ReviewPublic>(
        r#"
        SELECT r.id, r.product_id, r.user_id,
               u.name AS user_name, u.avatar_url AS user_avatar,
               r.rating, r.comment, r.created_at
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        WHERE r.user_id = $1 AND r.product_id = $2
        "#,
    )
    .bind(user_id)
    .bind(product_id)
    .fetch_optional(pool)
    .await?;
    Ok(row)
}

/// Upsert a review (INSERT or UPDATE if already reviewed).
pub async fn upsert(
    pool: &PgPool,
    user_id: Uuid,
    product_id: Uuid,
    input: &CreateReviewInput,
) -> Result<ReviewPublic, AppError> {
    if input.rating < 1 || input.rating > 5 {
        return Err(AppError::BadRequest(
            "Rating must be between 1 and 5".into(),
        ));
    }

    let review_id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO reviews (product_id, user_id, rating, comment)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (product_id, user_id)
        DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = NOW()
        RETURNING id
        "#,
    )
    .bind(product_id)
    .bind(user_id)
    .bind(input.rating)
    .bind(&input.comment)
    .fetch_one(pool)
    .await?;

    let row = sqlx::query_as::<_, ReviewPublic>(
        r#"
        SELECT r.id, r.product_id, r.user_id,
               u.name AS user_name, u.avatar_url AS user_avatar,
               r.rating, r.comment, r.created_at
        FROM reviews r JOIN users u ON u.id = r.user_id
        WHERE r.id = $1
        "#,
    )
    .bind(review_id)
    .fetch_one(pool)
    .await?;

    Ok(row)
}

/// Admin: list all reviews across all products, newest first.
pub async fn find_all_admin(
    pool: &PgPool,
    page: i64,
    limit: i64,
) -> Result<(Vec<ReviewPublic>, i64), AppError> {
    let offset = (page - 1) * limit;

    let rows = sqlx::query_as::<_, ReviewPublic>(
        r#"
        SELECT r.id, r.product_id, r.user_id,
               u.name AS user_name, u.avatar_url AS user_avatar,
               r.rating, r.comment, r.created_at
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        ORDER BY r.created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM reviews")
        .fetch_one(pool)
        .await?;

    Ok((rows, total))
}

/// Admin: delete a review by ID.
pub async fn delete(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
    let result = sqlx::query("DELETE FROM reviews WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("Review {id} not found")));
    }
    Ok(())
}
