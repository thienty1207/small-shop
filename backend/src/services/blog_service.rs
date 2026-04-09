use std::collections::{HashMap, HashSet};

use chrono::Utc;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::{
        blog::{
            AdminBlogPost, AdminBlogQuery, AdminBlogTag, BlogPostPublic, BlogPostRecord, BlogQuery,
            BlogTagInput, BlogTagSummary, CreateBlogPostInput, ExternalLinkPreview,
            PublicBlogTag, RelatedBlogPost, UpdateBlogPostInput,
        },
        product::PaginatedResponse,
    },
    repositories::blog_repo,
    repositories::product_repo,
    services::link_preview_service,
    state::AppState,
};

const MAX_TAGS_PER_POST: usize = 5;
const MAX_YOUTUBE_URLS: usize = 3;
const MAX_FEATURED_PRODUCTS_PER_POST: usize = 5;
const RELATED_POSTS_LIMIT: i64 = 4;

fn is_valid_youtube_url(url: &str) -> bool {
    let value = url.trim().to_lowercase();
    if !(value.starts_with("http://") || value.starts_with("https://")) {
        return false;
    }
    value.contains("youtube.com") || value.contains("youtu.be")
}

fn normalize_youtube_urls(raw: &[String]) -> Result<Vec<String>, AppError> {
    let mut seen = HashSet::new();
    let mut urls = Vec::new();

    for value in raw {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            continue;
        }

        if !is_valid_youtube_url(trimmed) {
            return Err(AppError::BadRequest(format!(
                "LiÃªn káº¿t YouTube khÃ´ng há»£p lá»‡: {trimmed}"
            )));
        }

        if seen.insert(trimmed.to_lowercase()) {
            urls.push(trimmed.to_string());
        }
    }

    if urls.len() > MAX_YOUTUBE_URLS {
        return Err(AppError::BadRequest(format!(
            "Chá»‰ Ä‘Æ°á»£c dÃ¹ng tá»‘i Ä‘a {MAX_YOUTUBE_URLS} liÃªn káº¿t YouTube."
        )));
    }

    Ok(urls)
}

fn is_valid_product_slug(value: &str) -> bool {
    !value.is_empty()
        && value
            .chars()
            .all(|ch| ch.is_ascii_lowercase() || ch.is_ascii_digit() || ch == '-')
}

fn extract_product_slug(input: &str) -> String {
    let raw = input.trim();
    if raw.is_empty() {
        return String::new();
    }

    let candidates = [
        "/product/",
        "/products/",
        "product/",
        "products/",
    ];

    for marker in candidates {
        if let Some(index) = raw.to_lowercase().find(marker) {
            let start = index + marker.len();
            let tail = &raw[start..];
            let slug = tail
                .split(['?', '#', '/', '&'])
                .next()
                .unwrap_or("")
                .trim()
                .to_lowercase();
            if !slug.is_empty() {
                return slug;
            }
        }
    }

    raw.split(['?', '#', '/', '&'])
        .next()
        .unwrap_or("")
        .trim()
        .to_lowercase()
}

async fn normalize_featured_product_slugs(
    state: &AppState,
    raw: &[String],
) -> Result<Vec<String>, AppError> {
    let mut seen = HashSet::new();
    let mut slugs = Vec::new();

    for value in raw {
        let normalized = extract_product_slug(value);
        if normalized.is_empty() {
            continue;
        }

        if !is_valid_product_slug(&normalized) {
            return Err(AppError::BadRequest(format!(
                "Slug sản phẩm không hợp lệ: {normalized}"
            )));
        }

        if seen.insert(normalized.clone()) {
            slugs.push(normalized);
        }
    }

    if slugs.len() > MAX_FEATURED_PRODUCTS_PER_POST {
        return Err(AppError::BadRequest(format!(
            "Chỉ được gắn tối đa {MAX_FEATURED_PRODUCTS_PER_POST} sản phẩm cho mỗi bài viết."
        )));
    }

    for slug in &slugs {
        if product_repo::find_by_slug(&state.db, slug).await?.is_none() {
            return Err(AppError::BadRequest(format!(
                "Sản phẩm với slug '{slug}' không tồn tại."
            )));
        }
    }

    Ok(slugs)
}

fn normalize_status(status: &str) -> Result<&str, AppError> {
    match status.trim().to_lowercase().as_str() {
        "draft" => Ok("draft"),
        "published" => Ok("published"),
        _ => Err(AppError::BadRequest(
            "Tráº¡ng thÃ¡i chá»‰ Ä‘Æ°á»£c lÃ  'draft' hoáº·c 'published'.".into(),
        )),
    }
}

fn parse_content_delta(raw: Option<String>) -> Result<Option<serde_json::Value>, AppError> {
    match raw {
        Some(value) => {
            let parsed = serde_json::from_str::<serde_json::Value>(&value).map_err(|error| {
                AppError::Internal(format!("Invalid content_delta JSON: {error}"))
            })?;
            Ok(Some(parsed))
        }
        None => Ok(None),
    }
}

fn serialize_content_delta(value: &Option<serde_json::Value>) -> Result<Option<String>, AppError> {
    match value {
        Some(payload) => serde_json::to_string(payload)
            .map(Some)
            .map_err(|error| AppError::BadRequest(format!("Invalid content_delta JSON: {error}"))),
        None => Ok(None),
    }
}

fn parse_external_link_previews(
    value: &serde_json::Value,
) -> Result<Vec<ExternalLinkPreview>, AppError> {
    serde_json::from_value(value.clone())
        .map_err(|error| AppError::Internal(format!("Invalid external_link_previews JSON: {error}")))
}

fn serialize_external_link_previews(
    previews: &[ExternalLinkPreview],
) -> Result<serde_json::Value, AppError> {
    serde_json::to_value(previews)
        .map_err(|error| AppError::Internal(format!("Invalid external_link_previews JSON: {error}")))
}

fn normalize_tag_ids(raw: &[Uuid]) -> Result<Vec<Uuid>, AppError> {
    let mut seen = HashSet::new();
    let mut ids = Vec::new();

    for tag_id in raw {
        if seen.insert(*tag_id) {
            ids.push(*tag_id);
        }
    }

    if ids.len() > MAX_TAGS_PER_POST {
        return Err(AppError::BadRequest(format!(
            "Má»—i bÃ i viáº¿t chá»‰ Ä‘Æ°á»£c chá»n tá»‘i Ä‘a {MAX_TAGS_PER_POST} tag."
        )));
    }

    Ok(ids)
}

fn normalize_tag_names(raw: Option<&[String]>) -> Vec<String> {
    let Some(values) = raw else {
        return vec![];
    };

    let mut seen = HashSet::new();
    let mut names = Vec::new();
    for value in values {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            continue;
        }
        if seen.insert(trimmed.to_lowercase()) {
            names.push(trimmed.to_string());
        }
    }
    names
}

fn resolve_primary_tag_id(
    tag_ids: &[Uuid],
    primary_tag_id: Option<Uuid>,
) -> Result<Option<Uuid>, AppError> {
    if tag_ids.is_empty() {
        if primary_tag_id.is_some() {
            return Err(AppError::BadRequest(
                "Khong the chon tag chinh khi bai viet chua co tag.".into(),
            ));
        }
        return Ok(None);
    }

    match primary_tag_id {
        Some(tag_id) if tag_ids.contains(&tag_id) => Ok(Some(tag_id)),
        Some(_) => Err(AppError::BadRequest(
            "Tag chinh phai nam trong danh sach tag da chon.".into(),
        )),
        None => Ok(tag_ids.first().copied()),
    }
}

fn resolve_primary_tag(
    tags: &[BlogTagSummary],
    primary_tag_id: Option<Uuid>,
) -> Option<BlogTagSummary> {
    let primary_tag_id = primary_tag_id?;
    tags.iter().find(|tag| tag.id == primary_tag_id).cloned()
}

fn map_related_posts(posts: Vec<RelatedBlogPost>) -> Vec<RelatedBlogPost> {
    posts
}

fn map_admin_post(
    post: BlogPostRecord,
    tags: Vec<BlogTagSummary>,
) -> Result<AdminBlogPost, AppError> {
    let primary_tag = resolve_primary_tag(&tags, post.primary_tag_id);

    Ok(AdminBlogPost {
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content_html: post.content_html.unwrap_or_default(),
        content_delta: parse_content_delta(post.content_delta)?,
        cover_image_url: post.cover_image_url,
        tags,
        primary_tag,
        youtube_urls: post.youtube_urls,
        featured_product_slugs: post.featured_product_slugs,
        external_link_previews: parse_external_link_previews(&post.external_link_previews)?,
        seo_title: post.seo_title,
        seo_description: post.seo_description,
        status: post.status,
        published_at: post.published_at,
        created_at: post.created_at,
        updated_at: post.updated_at,
    })
}

fn map_public_post(
    post: BlogPostRecord,
    tags: Vec<BlogTagSummary>,
    recommended_posts: Vec<RelatedBlogPost>,
) -> Result<BlogPostPublic, AppError> {
    let primary_tag = resolve_primary_tag(&tags, post.primary_tag_id);

    Ok(BlogPostPublic {
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content_html: post.content_html.unwrap_or_default(),
        cover_image_url: post.cover_image_url,
        tags,
        primary_tag,
        youtube_urls: post.youtube_urls,
        featured_product_slugs: post.featured_product_slugs,
        external_link_previews: parse_external_link_previews(&post.external_link_previews)?,
        seo_title: post.seo_title,
        seo_description: post.seo_description,
        status: post.status,
        published_at: post.published_at,
        created_at: post.created_at,
        recommended_posts: map_related_posts(recommended_posts),
    })
}

fn map_post_error(error: AppError) -> AppError {
    match error {
        AppError::Database(sqlx::Error::Database(db_error)) if db_error.is_unique_violation() => {
            AppError::BadRequest("Slug bai viet da ton tai.".into())
        }
        AppError::Database(sqlx::Error::Database(db_error))
            if db_error.is_foreign_key_violation() =>
        {
            AppError::BadRequest("Tag chinh khong hop le.".into())
        }
        other => other,
    }
}

fn map_tag_error(error: AppError) -> AppError {
    match error {
        AppError::Database(sqlx::Error::Database(db_error)) if db_error.is_unique_violation() => {
            AppError::BadRequest("Ten tag hoac slug da ton tai.".into())
        }
        other => other,
    }
}

async fn load_tags_by_post_ids(
    state: &AppState,
    post_ids: &[Uuid],
) -> Result<HashMap<Uuid, Vec<BlogTagSummary>>, AppError> {
    blog_repo::load_post_tags(&state.db, post_ids).await
}

async fn resolve_selected_tags(
    state: &AppState,
    tag_ids: &[Uuid],
    tag_names: Option<&[String]>,
) -> Result<Vec<Uuid>, AppError> {
    let mut normalized_ids = normalize_tag_ids(tag_ids)?;

    if normalized_ids.is_empty() {
        let names = normalize_tag_names(tag_names);
        if !names.is_empty() {
            let existing_tags = blog_repo::list_tags_by_names(&state.db, &names).await?;
            if existing_tags.len() != names.len() {
                return Err(AppError::BadRequest(
                    "CÃ³ tag khÃ´ng cÃ²n tá»“n táº¡i. Vui lÃ²ng táº£i láº¡i danh sÃ¡ch tag.".into(),
                ));
            }
            normalized_ids = existing_tags.into_iter().map(|tag| tag.id).collect();
        }
    }

    if normalized_ids.len() > MAX_TAGS_PER_POST {
        return Err(AppError::BadRequest(format!(
            "Má»—i bÃ i viáº¿t chá»‰ Ä‘Æ°á»£c chá»n tá»‘i Ä‘a {MAX_TAGS_PER_POST} tag."
        )));
    }

    if !normalized_ids.is_empty() {
        let existing_tags = blog_repo::list_tags_by_ids(&state.db, &normalized_ids).await?;
        if existing_tags.len() != normalized_ids.len() {
            return Err(AppError::BadRequest(
                "CÃ³ tag khÃ´ng cÃ²n tá»“n táº¡i. Vui lÃ²ng táº£i láº¡i danh sÃ¡ch tag.".into(),
            ));
        }
    }

    Ok(normalized_ids)
}

async fn build_external_link_previews(
    state: &AppState,
    content_html: Option<&str>,
    existing: &[ExternalLinkPreview],
) -> Vec<ExternalLinkPreview> {
    let html = content_html.unwrap_or_default().trim();
    if html.is_empty() {
        return vec![];
    }

    match link_preview_service::enrich_external_link_previews(&state.http_client, html, existing).await
    {
        Ok(previews) => previews,
        Err(error) => {
            tracing::warn!("Failed to build external link previews: {error}");
            existing.to_vec()
        }
    }
}

pub async fn list_admin_tags(state: &AppState) -> Result<Vec<AdminBlogTag>, AppError> {
    blog_repo::list_admin_tags(&state.db).await
}

pub async fn list_public_tags(state: &AppState) -> Result<Vec<PublicBlogTag>, AppError> {
    blog_repo::list_public_tags(&state.db).await
}

pub async fn create_tag(
    state: &AppState,
    input: &BlogTagInput,
) -> Result<serde_json::Value, AppError> {
    if input.name.trim().is_empty() {
        return Err(AppError::BadRequest("TÃªn tag lÃ  báº¯t buá»™c.".into()));
    }

    let tag = blog_repo::create_blog_tag(&state.db, &input.name, input.slug.as_deref())
        .await
        .map_err(map_tag_error)?;

    Ok(serde_json::json!(BlogTagSummary::from(tag)))
}

pub async fn update_tag(
    state: &AppState,
    id: Uuid,
    input: &BlogTagInput,
) -> Result<serde_json::Value, AppError> {
    if input.name.trim().is_empty() {
        return Err(AppError::BadRequest("TÃªn tag lÃ  báº¯t buá»™c.".into()));
    }

    let tag = blog_repo::update_blog_tag(&state.db, id, &input.name, input.slug.as_deref())
        .await
        .map_err(map_tag_error)?;

    Ok(serde_json::json!(BlogTagSummary::from(tag)))
}

pub async fn delete_tag(state: &AppState, id: Uuid) -> Result<(), AppError> {
    blog_repo::delete_blog_tag(&state.db, id).await
}

pub async fn list_public_posts(
    state: &AppState,
    query: &BlogQuery,
) -> Result<PaginatedResponse<BlogPostPublic>, AppError> {
    let page = blog_repo::find_public_page(&state.db, query).await?;
    let post_ids = page.items.iter().map(|post| post.id).collect::<Vec<_>>();
    let tags_map = load_tags_by_post_ids(state, &post_ids).await?;

    let items = page
        .items
        .into_iter()
        .map(|post| {
            let tags = tags_map.get(&post.id).cloned().unwrap_or_default();
            map_public_post(post, tags, vec![])
        })
        .collect::<Result<Vec<_>, _>>()?;

    Ok(PaginatedResponse {
        items,
        total: page.total,
        page: page.page,
        limit: page.limit,
        total_pages: page.total_pages,
    })
}

pub async fn get_public_post(state: &AppState, slug: &str) -> Result<BlogPostPublic, AppError> {
    let post = blog_repo::find_public_by_slug(&state.db, slug)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Blog post '{slug}' not found")))?;

    let tags_map = load_tags_by_post_ids(state, &[post.id]).await?;
    let tags = tags_map.get(&post.id).cloned().unwrap_or_default();
    let stored_previews = parse_external_link_previews(&post.external_link_previews)?;
    let external_link_previews =
        build_external_link_previews(state, post.content_html.as_deref(), &stored_previews).await;
    let related_posts = match post.primary_tag_id {
        Some(primary_tag_id) => {
            blog_repo::find_related_public_posts(
                &state.db,
                post.id,
                primary_tag_id,
                RELATED_POSTS_LIMIT,
            )
            .await?
        }
        None => vec![],
    };

    if external_link_previews != stored_previews {
        if let Ok(payload) = serialize_external_link_previews(&external_link_previews) {
            if let Err(error) =
                blog_repo::update_blog_post_external_link_previews(&state.db, post.id, &payload).await
            {
                tracing::warn!(
                    "Failed to persist external link previews for blog post {}: {}",
                    post.id,
                    error
                );
            }
        }
    }

    let public_post = BlogPostPublic {
        external_link_previews,
        ..map_public_post(post, tags, related_posts)?
    };

    Ok(public_post)
}

pub async fn list_admin_posts(
    state: &AppState,
    query: &AdminBlogQuery,
) -> Result<serde_json::Value, AppError> {
    let page = blog_repo::find_admin_page(&state.db, query).await?;
    let post_ids = page.items.iter().map(|post| post.id).collect::<Vec<_>>();
    let tags_map = load_tags_by_post_ids(state, &post_ids).await?;

    let mut items = Vec::with_capacity(page.items.len());
    for post in page.items {
        let tags = tags_map.get(&post.id).cloned().unwrap_or_default();
        items.push(map_admin_post(post, tags)?);
    }

    Ok(serde_json::json!({
        "items": items,
        "total": page.total,
        "page": page.page,
        "limit": page.limit,
        "total_pages": page.total_pages,
    }))
}

pub async fn get_admin_post(state: &AppState, id: Uuid) -> Result<serde_json::Value, AppError> {
    let post = blog_repo::find_admin_by_id(&state.db, id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Blog post {id} not found")))?;

    let tags_map = load_tags_by_post_ids(state, &[post.id]).await?;
    let tags = tags_map.get(&post.id).cloned().unwrap_or_default();
    let admin_post = map_admin_post(post, tags)?;
    Ok(serde_json::json!(admin_post))
}

pub async fn create_post(
    state: &AppState,
    input: &CreateBlogPostInput,
) -> Result<serde_json::Value, AppError> {
    if input.title.trim().is_empty() {
        return Err(AppError::BadRequest("Tieu de la bat buoc.".into()));
    }

    let status = normalize_status(&input.status)?;
    let tag_ids = resolve_selected_tags(state, &input.tag_ids, input.tags.as_deref()).await?;
    if tag_ids.is_empty() {
        return Err(AppError::BadRequest("Phai chon it nhat 1 tag.".into()));
    }
    let primary_tag_id = resolve_primary_tag_id(&tag_ids, input.primary_tag_id)?;
    let youtube_urls = normalize_youtube_urls(&input.youtube_urls)?;
    let featured_product_slugs =
        normalize_featured_product_slugs(state, &input.featured_product_slugs).await?;
    let external_link_previews = build_external_link_previews(
        state,
        input.content_html.as_deref(),
        &[],
    )
    .await;
    let content_delta = serialize_content_delta(&input.content_delta)?;
    let external_link_previews_json = serialize_external_link_previews(&external_link_previews)?;
    let published_at = if status == "published" {
        Some(input.published_at.unwrap_or_else(Utc::now))
    } else {
        input.published_at
    };

    let post = blog_repo::create_blog_post(
        &state.db,
        &input.title,
        input.slug.as_deref(),
        input.excerpt.as_deref(),
        input.content_html.as_deref(),
        content_delta.as_deref(),
        input.cover_image_url.as_deref(),
        &tag_ids,
        primary_tag_id,
        &youtube_urls,
        &featured_product_slugs,
        &external_link_previews_json,
        input.seo_title.as_deref(),
        input.seo_description.as_deref(),
        status,
        published_at,
    )
    .await
    .map_err(map_post_error)?;

    let tags_map = load_tags_by_post_ids(state, &[post.id]).await?;
    let tags = tags_map.get(&post.id).cloned().unwrap_or_default();
    let admin_post = map_admin_post(post, tags)?;
    Ok(serde_json::json!(admin_post))
}

pub async fn update_post(
    state: &AppState,
    id: Uuid,
    input: &UpdateBlogPostInput,
) -> Result<serde_json::Value, AppError> {
    if input.title.trim().is_empty() {
        return Err(AppError::BadRequest("Tieu de la bat buoc.".into()));
    }
    if input.slug.trim().is_empty() {
        return Err(AppError::BadRequest("Slug la bat buoc.".into()));
    }

    let status = normalize_status(&input.status)?;
    let has_tag_payload =
        !input.tag_ids.is_empty() || input.tags.is_some() || input.primary_tag_id.is_some();
    let mut tag_ids = resolve_selected_tags(state, &input.tag_ids, input.tags.as_deref()).await?;
    let mut primary_tag_id = resolve_primary_tag_id(&tag_ids, input.primary_tag_id)?;

    if !has_tag_payload {
        let existing_post = blog_repo::find_admin_by_id(&state.db, id)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("Blog post {id} not found")))?;
        tag_ids = blog_repo::list_post_tag_ids(&state.db, id).await?;
        if tag_ids.is_empty() {
            return Err(AppError::BadRequest("Phai chon it nhat 1 tag.".into()));
        }
        primary_tag_id = resolve_primary_tag_id(&tag_ids, existing_post.primary_tag_id)?;
    } else if tag_ids.is_empty() {
        return Err(AppError::BadRequest("Phai chon it nhat 1 tag.".into()));
    }

    let youtube_urls = normalize_youtube_urls(&input.youtube_urls)?;
    let featured_product_slugs =
        normalize_featured_product_slugs(state, &input.featured_product_slugs).await?;
    let existing_previews = match blog_repo::find_admin_by_id(&state.db, id).await? {
        Some(existing_post) => parse_external_link_previews(&existing_post.external_link_previews)?,
        None => vec![],
    };
    let external_link_previews = build_external_link_previews(
        state,
        input.content_html.as_deref(),
        &existing_previews,
    )
    .await;
    let content_delta = serialize_content_delta(&input.content_delta)?;
    let external_link_previews_json = serialize_external_link_previews(&external_link_previews)?;
    let published_at = if status == "published" {
        Some(input.published_at.unwrap_or_else(Utc::now))
    } else {
        input.published_at
    };

    let post = blog_repo::update_blog_post(
        &state.db,
        id,
        &input.title,
        &input.slug,
        input.excerpt.as_deref(),
        input.content_html.as_deref(),
        content_delta.as_deref(),
        input.cover_image_url.as_deref(),
        &tag_ids,
        primary_tag_id,
        &youtube_urls,
        &featured_product_slugs,
        &external_link_previews_json,
        input.seo_title.as_deref(),
        input.seo_description.as_deref(),
        status,
        published_at,
    )
    .await
    .map_err(map_post_error)?;

    let tags_map = load_tags_by_post_ids(state, &[post.id]).await?;
    let tags = tags_map.get(&post.id).cloned().unwrap_or_default();
    let admin_post = map_admin_post(post, tags)?;
    Ok(serde_json::json!(admin_post))
}

pub async fn delete_post(state: &AppState, id: Uuid) -> Result<(), AppError> {
    blog_repo::delete_blog_post(&state.db, id).await
}

#[cfg(test)]
mod tests {
    use super::{normalize_tag_ids, resolve_primary_tag_id};
    use crate::error::AppError;
    use uuid::Uuid;

    #[test]
    fn normalize_tag_ids_deduplicates_but_keeps_order() {
        let first = Uuid::new_v4();
        let second = Uuid::new_v4();

        let ids = normalize_tag_ids(&[first, second, first]).expect("normalize tag ids");

        assert_eq!(ids, vec![first, second]);
    }

    #[test]
    fn resolve_primary_tag_defaults_to_first_selected_tag() {
        let first = Uuid::new_v4();
        let second = Uuid::new_v4();

        let primary = resolve_primary_tag_id(&[first, second], None).expect("resolve primary tag");

        assert_eq!(primary, Some(first));
    }

    #[test]
    fn resolve_primary_tag_rejects_foreign_primary_tag() {
        let first = Uuid::new_v4();
        let second = Uuid::new_v4();

        let error = resolve_primary_tag_id(&[first], Some(second))
            .expect_err("must reject invalid primary tag");

        assert!(matches!(error, AppError::BadRequest(_)));
    }
}
