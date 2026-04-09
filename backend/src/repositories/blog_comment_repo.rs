use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::blog_comment::{BlogCommentPublic, BlogCommentQuery, BlogCommentReplyPublic},
};

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct CommentMeta {
    pub id: Uuid,
    pub blog_post_id: Uuid,
    pub user_id: Uuid,
    pub comment: String,
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct ReplyMeta {
    pub id: Uuid,
    pub blog_post_id: Uuid,
    pub parent_review_id: Uuid,
    pub user_id: Uuid,
}

pub async fn find_comment_meta(pool: &PgPool, comment_id: Uuid) -> Result<Option<CommentMeta>, AppError> {
    let row = sqlx::query_as::<_, CommentMeta>(
        r#"
        SELECT br.id, br.blog_post_id, br.user_id, br.comment
        FROM blog_reviews br
        WHERE br.id = $1
          AND br.comment IS NOT NULL
          AND BTRIM(br.comment) <> ''
        "#,
    )
    .bind(comment_id)
    .fetch_optional(pool)
    .await?;

    Ok(row)
}

pub async fn find_reply_meta(pool: &PgPool, reply_id: Uuid) -> Result<Option<ReplyMeta>, AppError> {
    let row = sqlx::query_as::<_, ReplyMeta>(
        r#"
        SELECT bcr.id, bcr.blog_post_id, bcr.parent_review_id, bcr.user_id
        FROM blog_comment_replies bcr
        WHERE bcr.id = $1
        "#,
    )
    .bind(reply_id)
    .fetch_optional(pool)
    .await?;

    Ok(row)
}

pub async fn find_comments_by_post(
    pool: &PgPool,
    blog_post_id: Uuid,
    query: &BlogCommentQuery,
) -> Result<(Vec<BlogCommentPublic>, i64), AppError> {
    let offset = (query.page - 1) * query.limit;

    let rows = sqlx::query_as::<_, BlogCommentPublic>(
        r#"
        SELECT br.id,
               br.blog_post_id,
               br.user_id,
               u.name AS user_name,
               u.avatar_url AS user_avatar,
               br.comment,
               br.created_at,
               (
                 SELECT COUNT(*)::bigint
                 FROM blog_comment_likes bcl
                 WHERE bcl.comment_id = br.id
               ) AS likes_count,
               (
                 SELECT COUNT(*)::bigint
                 FROM blog_comment_replies bcr
                 WHERE bcr.parent_review_id = br.id
               ) AS replies_count
        FROM blog_reviews br
        JOIN users u ON u.id = br.user_id
        WHERE br.blog_post_id = $1
          AND br.comment IS NOT NULL
          AND BTRIM(br.comment) <> ''
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
        SELECT COUNT(*)::bigint
        FROM blog_reviews br
        WHERE br.blog_post_id = $1
          AND br.comment IS NOT NULL
          AND BTRIM(br.comment) <> ''
        "#,
    )
    .bind(blog_post_id)
    .fetch_one(pool)
    .await?;

    Ok((rows, total))
}

pub async fn find_replies(
    pool: &PgPool,
    parent_review_id: Uuid,
    query: &BlogCommentQuery,
) -> Result<(Vec<BlogCommentReplyPublic>, i64), AppError> {
    let offset = (query.page - 1) * query.limit;

    let rows = sqlx::query_as::<_, BlogCommentReplyPublic>(
        r#"
        SELECT bcr.id,
               bcr.blog_post_id,
               bcr.parent_review_id,
             bcr.reply_to_reply_id,
             bcr.reply_to_user_id,
             ru.name AS reply_to_user_name,
               bcr.user_id,
               u.name AS user_name,
               u.avatar_url AS user_avatar,
               bcr.content,
               bcr.created_at
        FROM blog_comment_replies bcr
        JOIN users u ON u.id = bcr.user_id
         LEFT JOIN users ru ON ru.id = bcr.reply_to_user_id
        WHERE bcr.parent_review_id = $1
        ORDER BY bcr.created_at ASC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(parent_review_id)
    .bind(query.limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let total: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)::bigint
        FROM blog_comment_replies
        WHERE parent_review_id = $1
        "#,
    )
    .bind(parent_review_id)
    .fetch_one(pool)
    .await?;

    Ok((rows, total))
}

pub async fn insert_reply(
    pool: &PgPool,
    blog_post_id: Uuid,
    parent_review_id: Uuid,
    reply_to_reply_id: Option<Uuid>,
    reply_to_user_id: Option<Uuid>,
    user_id: Uuid,
    content: &str,
) -> Result<BlogCommentReplyPublic, AppError> {
    let id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO blog_comment_replies (blog_post_id, parent_review_id, reply_to_reply_id, reply_to_user_id, user_id, content)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        "#,
    )
    .bind(blog_post_id)
    .bind(parent_review_id)
    .bind(reply_to_reply_id)
    .bind(reply_to_user_id)
    .bind(user_id)
    .bind(content)
    .fetch_one(pool)
    .await?;

    let row = sqlx::query_as::<_, BlogCommentReplyPublic>(
        r#"
        SELECT bcr.id,
               bcr.blog_post_id,
               bcr.parent_review_id,
             bcr.reply_to_reply_id,
             bcr.reply_to_user_id,
             ru.name AS reply_to_user_name,
               bcr.user_id,
               u.name AS user_name,
               u.avatar_url AS user_avatar,
               bcr.content,
               bcr.created_at
        FROM blog_comment_replies bcr
        JOIN users u ON u.id = bcr.user_id
         LEFT JOIN users ru ON ru.id = bcr.reply_to_user_id
        WHERE bcr.id = $1
        "#,
    )
    .bind(id)
    .fetch_one(pool)
    .await?;

    Ok(row)
}

pub async fn toggle_comment_like(
    pool: &PgPool,
    comment_id: Uuid,
    user_id: Uuid,
) -> Result<(bool, i64), AppError> {
    let mut tx = pool.begin().await?;

    let existing: Option<(Uuid,)> = sqlx::query_as(
        "SELECT comment_id FROM blog_comment_likes WHERE comment_id = $1 AND user_id = $2",
    )
    .bind(comment_id)
    .bind(user_id)
    .fetch_optional(&mut *tx)
    .await?;

    let liked = if existing.is_some() {
        sqlx::query("DELETE FROM blog_comment_likes WHERE comment_id = $1 AND user_id = $2")
            .bind(comment_id)
            .bind(user_id)
            .execute(&mut *tx)
            .await?;
        false
    } else {
        sqlx::query(
            "INSERT INTO blog_comment_likes (comment_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        )
        .bind(comment_id)
        .bind(user_id)
        .execute(&mut *tx)
        .await?;
        true
    };

    let likes_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM blog_comment_likes WHERE comment_id = $1",
    )
    .bind(comment_id)
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok((liked, likes_count))
}

pub async fn find_liked_comment_ids_by_user(
    pool: &PgPool,
    blog_post_id: Uuid,
    user_id: Uuid,
) -> Result<Vec<Uuid>, AppError> {
    let ids = sqlx::query_scalar::<_, Uuid>(
        r#"
        SELECT bcl.comment_id
        FROM blog_comment_likes bcl
        JOIN blog_reviews br ON br.id = bcl.comment_id
        WHERE bcl.user_id = $1
          AND br.blog_post_id = $2
        "#,
    )
    .bind(user_id)
    .bind(blog_post_id)
    .fetch_all(pool)
    .await?;

    Ok(ids)
}

pub async fn delete_comment(pool: &PgPool, comment_id: Uuid) -> Result<(), AppError> {
    let result = sqlx::query("DELETE FROM blog_reviews WHERE id = $1")
        .bind(comment_id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("Blog comment {comment_id} not found")));
    }

    Ok(())
}

pub async fn delete_reply(pool: &PgPool, reply_id: Uuid) -> Result<(), AppError> {
    let result = sqlx::query("DELETE FROM blog_comment_replies WHERE id = $1")
        .bind(reply_id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("Blog reply {reply_id} not found")));
    }

    Ok(())
}
