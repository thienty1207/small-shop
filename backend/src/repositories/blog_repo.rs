use std::collections::HashMap;

use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;

use crate::{
    error::AppError,
    models::blog::{
        AdminBlogQuery, AdminBlogTag, BlogPostRecord, BlogQuery, BlogTagRecord, BlogTagSummary,
        PublicBlogTag, RelatedBlogPost,
    },
    models::product::PaginatedResponse,
};

fn slugify(value: &str) -> String {
    let map: &[(&str, &str)] = &[
        ("à|á|ả|ã|ạ|ă|ắ|ặ|ằ|ẳ|ẵ|â|ấ|ầ|ẩ|ẫ|ậ", "a"),
        ("è|é|ẹ|ẻ|ẽ|ê|ế|ề|ệ|ể|ễ", "e"),
        ("ì|í|ị|ỉ|ĩ", "i"),
        ("ò|ó|ọ|ỏ|õ|ô|ố|ồ|ộ|ổ|ỗ|ơ|ớ|ờ|ợ|ở|ỡ", "o"),
        ("ù|ú|ụ|ủ|ũ|ư|ứ|ừ|ự|ử|ữ", "u"),
        ("ỳ|ý|ỵ|ỷ|ỹ", "y"),
        ("đ", "d"),
    ];

    let mut normalized = value.trim().to_lowercase();
    for (chars, replacement) in map {
        for ch in chars.split('|') {
            normalized = normalized.replace(ch, replacement);
        }
    }

    normalized
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() { ch } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|segment| !segment.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

#[derive(Debug, sqlx::FromRow)]
struct PostTagRow {
    post_id: Uuid,
    id: Uuid,
    name: String,
    slug: String,
}

#[derive(Debug, sqlx::FromRow)]
struct RelatedBlogPostRow {
    id: Uuid,
    title: String,
    slug: String,
    excerpt: Option<String>,
    cover_image_url: Option<String>,
    published_at: Option<chrono::DateTime<chrono::Utc>>,
    primary_tag_id: Option<Uuid>,
    primary_tag_name: Option<String>,
    primary_tag_slug: Option<String>,
}

impl From<RelatedBlogPostRow> for RelatedBlogPost {
    fn from(row: RelatedBlogPostRow) -> Self {
        Self {
            id: row.id,
            title: row.title,
            slug: row.slug,
            excerpt: row.excerpt,
            cover_image_url: row.cover_image_url,
            published_at: row.published_at,
            primary_tag: match (
                row.primary_tag_id,
                row.primary_tag_name,
                row.primary_tag_slug,
            ) {
                (Some(id), Some(name), Some(slug)) => Some(BlogTagSummary { id, name, slug }),
                _ => None,
            },
        }
    }
}

async fn load_tags_for_posts(
    pool: &PgPool,
    post_ids: &[Uuid],
) -> Result<HashMap<Uuid, Vec<BlogTagSummary>>, AppError> {
    if post_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let rows = sqlx::query_as::<_, PostTagRow>(
        r#"
        SELECT bpt.post_id, bt.id, bt.name, bt.slug
        FROM blog_post_tags bpt
        JOIN blog_tags bt ON bt.id = bpt.tag_id
        WHERE bpt.post_id = ANY($1)
        ORDER BY bt.name ASC
        "#,
    )
    .bind(post_ids.to_vec())
    .fetch_all(pool)
    .await?;

    let mut map: HashMap<Uuid, Vec<BlogTagSummary>> = HashMap::new();
    for row in rows {
        map.entry(row.post_id).or_default().push(BlogTagSummary {
            id: row.id,
            name: row.name,
            slug: row.slug,
        });
    }

    Ok(map)
}

async fn sync_post_tags(
    tx: &mut Transaction<'_, Postgres>,
    post_id: Uuid,
    tag_ids: &[Uuid],
) -> Result<(), AppError> {
    sqlx::query("DELETE FROM blog_post_tags WHERE post_id = $1")
        .bind(post_id)
        .execute(&mut **tx)
        .await?;

    if tag_ids.is_empty() {
        return Ok(());
    }

    sqlx::query(
        r#"
        INSERT INTO blog_post_tags (post_id, tag_id)
        SELECT $1, UNNEST($2::UUID[])
        "#,
    )
    .bind(post_id)
    .bind(tag_ids.to_vec())
    .execute(&mut **tx)
    .await?;

    Ok(())
}

pub async fn list_admin_tags(pool: &PgPool) -> Result<Vec<AdminBlogTag>, AppError> {
    let tags = sqlx::query_as::<_, AdminBlogTag>(
        r#"
        SELECT
            bt.id,
            bt.name,
            bt.slug,
            COUNT(bpt.post_id)::BIGINT AS posts_count,
            bt.created_at,
            bt.updated_at
        FROM blog_tags bt
        LEFT JOIN blog_post_tags bpt ON bpt.tag_id = bt.id
        GROUP BY bt.id
        ORDER BY bt.name ASC
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(tags)
}

pub async fn list_public_tags(pool: &PgPool) -> Result<Vec<PublicBlogTag>, AppError> {
    let tags = sqlx::query_as::<_, PublicBlogTag>(
        r#"
        SELECT
            bt.id,
            bt.name,
            bt.slug,
            COUNT(bp.id)::BIGINT AS posts_count
        FROM blog_tags bt
        JOIN blog_post_tags bpt ON bpt.tag_id = bt.id
        JOIN blog_posts bp ON bp.id = bpt.post_id
        WHERE bp.status = 'published'
          AND bp.published_at IS NOT NULL
        GROUP BY bt.id
        ORDER BY bt.name ASC
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(tags)
}

pub async fn list_tags_by_ids(pool: &PgPool, ids: &[Uuid]) -> Result<Vec<BlogTagRecord>, AppError> {
    if ids.is_empty() {
        return Ok(vec![]);
    }

    let tags = sqlx::query_as::<_, BlogTagRecord>(
        r#"
        SELECT id, name, slug, created_at, updated_at
        FROM blog_tags
        WHERE id = ANY($1)
        ORDER BY name ASC
        "#,
    )
    .bind(ids.to_vec())
    .fetch_all(pool)
    .await?;

    Ok(tags)
}

pub async fn list_tags_by_names(
    pool: &PgPool,
    names: &[String],
) -> Result<Vec<BlogTagRecord>, AppError> {
    if names.is_empty() {
        return Ok(vec![]);
    }

    let tags = sqlx::query_as::<_, BlogTagRecord>(
        r#"
        SELECT id, name, slug, created_at, updated_at
        FROM blog_tags
        WHERE name = ANY($1)
        ORDER BY name ASC
        "#,
    )
    .bind(names.to_vec())
    .fetch_all(pool)
    .await?;

    Ok(tags)
}

pub async fn list_post_tag_ids(pool: &PgPool, post_id: Uuid) -> Result<Vec<Uuid>, AppError> {
    let rows = sqlx::query_scalar::<_, Uuid>(
        r#"
        SELECT tag_id
        FROM blog_post_tags
        WHERE post_id = $1
        ORDER BY tag_id
        "#,
    )
    .bind(post_id)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

pub async fn create_blog_tag(
    pool: &PgPool,
    name: &str,
    slug: Option<&str>,
) -> Result<BlogTagRecord, AppError> {
    let resolved_slug = slug
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| slugify(name));

    let tag = sqlx::query_as::<_, BlogTagRecord>(
        r#"
        INSERT INTO blog_tags (name, slug)
        VALUES ($1, $2)
        RETURNING id, name, slug, created_at, updated_at
        "#,
    )
    .bind(name.trim())
    .bind(resolved_slug)
    .fetch_one(pool)
    .await?;

    Ok(tag)
}

pub async fn update_blog_tag(
    pool: &PgPool,
    id: Uuid,
    name: &str,
    slug: Option<&str>,
) -> Result<BlogTagRecord, AppError> {
    let resolved_slug = slug
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| slugify(name));

    let tag = sqlx::query_as::<_, BlogTagRecord>(
        r#"
        UPDATE blog_tags
        SET name = $2,
            slug = $3,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, name, slug, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(name.trim())
    .bind(resolved_slug)
    .fetch_optional(pool)
    .await?;

    tag.ok_or_else(|| AppError::NotFound(format!("Blog tag {id} not found")))
}

pub async fn delete_blog_tag(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
    let usage_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM blog_post_tags
        WHERE tag_id = $1
        "#,
    )
    .bind(id)
    .fetch_one(pool)
    .await?;

    if usage_count > 0 {
        return Err(AppError::BadRequest(
            "Tag này đang được sử dụng trong bài viết, chưa thể xóa.".into(),
        ));
    }

    let rows = sqlx::query("DELETE FROM blog_tags WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;

    if rows.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("Blog tag {id} not found")));
    }

    Ok(())
}

pub async fn find_public_page(
    pool: &PgPool,
    query: &BlogQuery,
) -> Result<PaginatedResponse<BlogPostRecord>, AppError> {
    let offset = (query.page - 1) * query.limit;
    let search = query
        .search
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| format!("%{value}%"));

    let items = sqlx::query_as::<_, BlogPostRecord>(
        r#"
        SELECT
            bp.id,
            bp.title,
            bp.slug,
            bp.excerpt,
            bp.content_html,
            bp.content_delta,
            bp.cover_image_url,
            bp.youtube_urls,
            bp.external_link_previews,
            bp.seo_title,
            bp.seo_description,
            bp.status,
            bp.primary_tag_id,
            bp.published_at,
            bp.created_at,
            bp.updated_at
        FROM blog_posts bp
        WHERE bp.status = 'published'
          AND bp.published_at IS NOT NULL
          AND (
              $3::TEXT IS NULL
              OR EXISTS (
                  SELECT 1
                  FROM blog_post_tags bpt
                  JOIN blog_tags bt ON bt.id = bpt.tag_id
                  WHERE bpt.post_id = bp.id
                    AND bt.slug = $3
              )
          )
                    AND (
                            $4::TEXT IS NULL
                            OR bp.title ILIKE $4
                    )
        ORDER BY bp.published_at DESC, bp.created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(query.limit)
    .bind(offset)
    .bind(query.tag.as_deref())
        .bind(search.as_deref())
    .fetch_all(pool)
    .await?;

    let total: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM blog_posts bp
        WHERE bp.status = 'published'
          AND bp.published_at IS NOT NULL
          AND (
              $1::TEXT IS NULL
              OR EXISTS (
                  SELECT 1
                  FROM blog_post_tags bpt
                  JOIN blog_tags bt ON bt.id = bpt.tag_id
                  WHERE bpt.post_id = bp.id
                    AND bt.slug = $1
              )
          )
                    AND (
                            $2::TEXT IS NULL
                            OR bp.title ILIKE $2
                    )
        "#,
    )
    .bind(query.tag.as_deref())
        .bind(search.as_deref())
    .fetch_one(pool)
    .await?;

    let total_pages = (total + query.limit - 1) / query.limit;
    Ok(PaginatedResponse {
        items,
        total,
        page: query.page,
        limit: query.limit,
        total_pages,
    })
}

pub async fn find_public_by_slug(
    pool: &PgPool,
    slug: &str,
) -> Result<Option<BlogPostRecord>, AppError> {
    let post = sqlx::query_as::<_, BlogPostRecord>(
        r#"
        SELECT
            bp.id,
            bp.title,
            bp.slug,
            bp.excerpt,
            bp.content_html,
            bp.content_delta,
            bp.cover_image_url,
            bp.youtube_urls,
            bp.external_link_previews,
            bp.seo_title,
            bp.seo_description,
            bp.status,
            bp.primary_tag_id,
            bp.published_at,
            bp.created_at,
            bp.updated_at
        FROM blog_posts bp
        WHERE bp.slug = $1
          AND bp.status = 'published'
          AND bp.published_at IS NOT NULL
        "#,
    )
    .bind(slug)
    .fetch_optional(pool)
    .await?;

    Ok(post)
}

pub async fn find_related_public_posts(
    pool: &PgPool,
    post_id: Uuid,
    primary_tag_id: Uuid,
    limit: i64,
) -> Result<Vec<RelatedBlogPost>, AppError> {
    let rows = sqlx::query_as::<_, RelatedBlogPostRow>(
        r#"
        SELECT
            bp.id,
            bp.title,
            bp.slug,
            bp.excerpt,
            bp.cover_image_url,
            bp.published_at,
            bt.id AS primary_tag_id,
            bt.name AS primary_tag_name,
            bt.slug AS primary_tag_slug
        FROM blog_posts bp
        LEFT JOIN blog_tags bt ON bt.id = bp.primary_tag_id
        WHERE bp.status = 'published'
          AND bp.published_at IS NOT NULL
          AND bp.id <> $1
          AND bp.primary_tag_id = $2
        ORDER BY bp.published_at DESC, bp.created_at DESC
        LIMIT $3
        "#,
    )
    .bind(post_id)
    .bind(primary_tag_id)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(RelatedBlogPost::from).collect())
}

pub async fn find_admin_page(
    pool: &PgPool,
    query: &AdminBlogQuery,
) -> Result<PaginatedResponse<BlogPostRecord>, AppError> {
    let offset = (query.page - 1) * query.limit;

    let items = sqlx::query_as::<_, BlogPostRecord>(
        r#"
        SELECT
            bp.id,
            bp.title,
            bp.slug,
            bp.excerpt,
            bp.content_html,
            bp.content_delta,
            bp.cover_image_url,
            bp.youtube_urls,
            bp.external_link_previews,
            bp.seo_title,
            bp.seo_description,
            bp.status,
            bp.primary_tag_id,
            bp.published_at,
            bp.created_at,
            bp.updated_at
        FROM blog_posts bp
        WHERE ($1::TEXT IS NULL OR bp.title ILIKE '%' || $1 || '%')
          AND ($2::TEXT IS NULL OR bp.status = $2)
        ORDER BY bp.created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(query.search.as_deref())
    .bind(query.status.as_deref())
    .bind(query.limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let total: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM blog_posts bp
        WHERE ($1::TEXT IS NULL OR bp.title ILIKE '%' || $1 || '%')
          AND ($2::TEXT IS NULL OR bp.status = $2)
        "#,
    )
    .bind(query.search.as_deref())
    .bind(query.status.as_deref())
    .fetch_one(pool)
    .await?;

    let total_pages = (total + query.limit - 1) / query.limit;
    Ok(PaginatedResponse {
        items,
        total,
        page: query.page,
        limit: query.limit,
        total_pages,
    })
}

pub async fn find_admin_by_id(pool: &PgPool, id: Uuid) -> Result<Option<BlogPostRecord>, AppError> {
    let post = sqlx::query_as::<_, BlogPostRecord>(
        r#"
        SELECT
            bp.id,
            bp.title,
            bp.slug,
            bp.excerpt,
            bp.content_html,
            bp.content_delta,
            bp.cover_image_url,
            bp.youtube_urls,
            bp.external_link_previews,
            bp.seo_title,
            bp.seo_description,
            bp.status,
            bp.primary_tag_id,
            bp.published_at,
            bp.created_at,
            bp.updated_at
        FROM blog_posts bp
        WHERE bp.id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(post)
}

pub async fn create_blog_post(
    pool: &PgPool,
    title: &str,
    slug: Option<&str>,
    excerpt: Option<&str>,
    content_html: Option<&str>,
    content_delta: Option<&str>,
    cover_image_url: Option<&str>,
    tag_ids: &[Uuid],
    primary_tag_id: Option<Uuid>,
    youtube_urls: &[String],
    external_link_previews: &serde_json::Value,
    seo_title: Option<&str>,
    seo_description: Option<&str>,
    status: &str,
    published_at: Option<chrono::DateTime<chrono::Utc>>,
) -> Result<BlogPostRecord, AppError> {
    let resolved_slug = slug
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| slugify(title));

    let mut tx = pool.begin().await?;

    let id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO blog_posts
            (
                title,
                slug,
                excerpt,
                content_html,
                content_delta,
                cover_image_url,
                youtube_urls,
                external_link_previews,
                seo_title,
                seo_description,
                status,
                primary_tag_id,
                published_at
            )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
        "#,
    )
    .bind(title)
    .bind(&resolved_slug)
    .bind(excerpt)
    .bind(content_html)
    .bind(content_delta)
    .bind(cover_image_url)
    .bind(youtube_urls.to_vec())
    .bind(external_link_previews)
    .bind(seo_title)
    .bind(seo_description)
    .bind(status)
    .bind(primary_tag_id)
    .bind(published_at)
    .fetch_one(&mut *tx)
    .await?;

    sync_post_tags(&mut tx, id, tag_ids).await?;
    tx.commit().await?;

    find_admin_by_id(pool, id)
        .await?
        .ok_or_else(|| AppError::Internal("Failed to fetch created blog post".into()))
}

pub async fn update_blog_post(
    pool: &PgPool,
    id: Uuid,
    title: &str,
    slug: &str,
    excerpt: Option<&str>,
    content_html: Option<&str>,
    content_delta: Option<&str>,
    cover_image_url: Option<&str>,
    tag_ids: &[Uuid],
    primary_tag_id: Option<Uuid>,
    youtube_urls: &[String],
    external_link_previews: &serde_json::Value,
    seo_title: Option<&str>,
    seo_description: Option<&str>,
    status: &str,
    published_at: Option<chrono::DateTime<chrono::Utc>>,
) -> Result<BlogPostRecord, AppError> {
    let mut tx = pool.begin().await?;

    let rows = sqlx::query(
        r#"
        UPDATE blog_posts
        SET title = $2,
            slug = $3,
            excerpt = $4,
            content_html = $5,
            content_delta = $6,
            cover_image_url = $7,
            youtube_urls = $8,
            external_link_previews = $9,
            seo_title = $10,
            seo_description = $11,
            status = $12,
            primary_tag_id = $13,
            published_at = $14,
            updated_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(id)
    .bind(title)
    .bind(slug)
    .bind(excerpt)
    .bind(content_html)
    .bind(content_delta)
    .bind(cover_image_url)
    .bind(youtube_urls.to_vec())
    .bind(external_link_previews)
    .bind(seo_title)
    .bind(seo_description)
    .bind(status)
    .bind(primary_tag_id)
    .bind(published_at)
    .execute(&mut *tx)
    .await?;

    if rows.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("Blog post {id} not found")));
    }

    sync_post_tags(&mut tx, id, tag_ids).await?;
    tx.commit().await?;

    find_admin_by_id(pool, id)
        .await?
        .ok_or_else(|| AppError::Internal("Failed to fetch updated blog post".into()))
}

pub async fn delete_blog_post(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
    let rows = sqlx::query("DELETE FROM blog_posts WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;

    if rows.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("Blog post {id} not found")));
    }

    Ok(())
}

pub async fn update_blog_post_external_link_previews(
    pool: &PgPool,
    id: Uuid,
    external_link_previews: &serde_json::Value,
) -> Result<(), AppError> {
    let rows = sqlx::query(
        r#"
        UPDATE blog_posts
        SET external_link_previews = $2,
            updated_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(id)
    .bind(external_link_previews)
    .execute(pool)
    .await?;

    if rows.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("Blog post {id} not found")));
    }

    Ok(())
}

pub async fn load_post_tags(
    pool: &PgPool,
    post_ids: &[Uuid],
) -> Result<HashMap<Uuid, Vec<BlogTagSummary>>, AppError> {
    load_tags_for_posts(pool, post_ids).await
}
