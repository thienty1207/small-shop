use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::blog_review::{
        BlogHeartUserPublic, BlogReviewAdminPublic, BlogReviewPublic, BlogReviewQuery,
        CreateBlogReviewInput,
    },
};

pub async fn find_by_blog_post(
    pool: &PgPool,
    blog_post_id: Uuid,
    query: &BlogReviewQuery,
) -> Result<(Vec<BlogReviewPublic>, i64, i64), AppError> {
    let offset = (query.page - 1) * query.limit;

    let rows = sqlx::query_as::<_, BlogReviewPublic>(
        r#"
        SELECT br.id, br.blog_post_id, br.user_id,
               u.name AS user_name,
               u.avatar_url AS user_avatar,
               br.hearted, br.comment, br.created_at
        FROM blog_reviews br
        JOIN users u ON u.id = br.user_id
        WHERE br.blog_post_id = $1
          AND (
              br.hearted = TRUE
              OR (br.comment IS NOT NULL AND BTRIM(br.comment) <> '')
          )
        ORDER BY br.created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(blog_post_id)
    .bind(query.limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let total: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM blog_reviews br
        WHERE br.blog_post_id = $1
          AND (
              br.hearted = TRUE
              OR (br.comment IS NOT NULL AND BTRIM(br.comment) <> '')
          )
        "#,
    )
    .bind(blog_post_id)
    .fetch_one(pool)
    .await?;

    let hearts_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM blog_reviews
        WHERE blog_post_id = $1
          AND hearted = TRUE
        "#,
    )
    .bind(blog_post_id)
    .fetch_one(pool)
    .await?;

    Ok((rows, total, hearts_count))
}

pub async fn find_by_user_blog_post(
    pool: &PgPool,
    user_id: Uuid,
    blog_post_id: Uuid,
) -> Result<Option<BlogReviewPublic>, AppError> {
    let row = sqlx::query_as::<_, BlogReviewPublic>(
        r#"
        SELECT br.id, br.blog_post_id, br.user_id,
               u.name AS user_name,
               u.avatar_url AS user_avatar,
               br.hearted, br.comment, br.created_at
        FROM blog_reviews br
        JOIN users u ON u.id = br.user_id
        WHERE br.user_id = $1 AND br.blog_post_id = $2
        "#,
    )
    .bind(user_id)
    .bind(blog_post_id)
    .fetch_optional(pool)
    .await?;

    Ok(row)
}

pub async fn find_hearted_users(
        pool: &PgPool,
        blog_post_id: Uuid,
        query: &BlogReviewQuery,
) -> Result<(Vec<BlogHeartUserPublic>, i64), AppError> {
        let offset = (query.page - 1) * query.limit;

        let rows = sqlx::query_as::<_, BlogHeartUserPublic>(
                r#"
                SELECT br.user_id,
                             u.name AS user_name,
                             u.avatar_url AS user_avatar,
                             br.created_at AS hearted_at
                FROM blog_reviews br
                JOIN users u ON u.id = br.user_id
                WHERE br.blog_post_id = $1
                    AND br.hearted = TRUE
                ORDER BY br.created_at DESC
                LIMIT $2 OFFSET $3
                "#,
        )
        .bind(blog_post_id)
        .bind(query.limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        let total: i64 = sqlx::query_scalar(
                r#"
                SELECT COUNT(*)
                FROM blog_reviews br
                WHERE br.blog_post_id = $1
                    AND br.hearted = TRUE
                "#,
        )
        .bind(blog_post_id)
        .fetch_one(pool)
        .await?;

        Ok((rows, total))
}

pub async fn upsert(
    pool: &PgPool,
    user_id: Uuid,
    blog_post_id: Uuid,
    input: &CreateBlogReviewInput,
) -> Result<BlogReviewPublic, AppError> {
    let hearted = input.hearted.unwrap_or(true);
    let comment = input.comment.as_ref().map(|value| value.trim().to_string());

    let id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO blog_reviews (blog_post_id, user_id, hearted, comment)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (blog_post_id, user_id)
        DO UPDATE SET hearted = EXCLUDED.hearted,
                      comment = EXCLUDED.comment,
                      updated_at = NOW()
        RETURNING id
        "#,
    )
    .bind(blog_post_id)
    .bind(user_id)
    .bind(hearted)
    .bind(comment)
    .fetch_one(pool)
    .await?;

    let row = sqlx::query_as::<_, BlogReviewPublic>(
        r#"
        SELECT br.id, br.blog_post_id, br.user_id,
               u.name AS user_name,
               u.avatar_url AS user_avatar,
               br.hearted, br.comment, br.created_at
        FROM blog_reviews br
        JOIN users u ON u.id = br.user_id
        WHERE br.id = $1
        "#,
    )
    .bind(id)
    .fetch_one(pool)
    .await?;

    Ok(row)
}

pub async fn find_all_admin(
    pool: &PgPool,
    page: i64,
    limit: i64,
) -> Result<(Vec<BlogReviewAdminPublic>, i64), AppError> {
    let offset = (page - 1) * limit;

    let rows = sqlx::query_as::<_, BlogReviewAdminPublic>(
        r#"
        SELECT br.id, br.blog_post_id,
               bp.title AS blog_post_title,
               bp.slug  AS blog_post_slug,
               br.user_id,
               u.name AS user_name,
               u.avatar_url AS user_avatar,
               br.hearted,
               br.comment,
               br.created_at
        FROM blog_reviews br
        JOIN blog_posts bp ON bp.id = br.blog_post_id
        JOIN users u ON u.id = br.user_id
        WHERE (
            br.hearted = TRUE
            OR (br.comment IS NOT NULL AND BTRIM(br.comment) <> '')
        )
        ORDER BY br.created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let total: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM blog_reviews br
        WHERE (
            br.hearted = TRUE
            OR (br.comment IS NOT NULL AND BTRIM(br.comment) <> '')
        )
        "#,
    )
    .fetch_one(pool)
    .await?;

    Ok((rows, total))
}

pub async fn delete(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
    let result = sqlx::query("DELETE FROM blog_reviews WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("Blog review {id} not found")));
    }

    Ok(())
}
