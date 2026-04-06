use uuid::Uuid;

use crate::{
    error::AppError,
    models::{
        admin::AdminPublic,
        blog_comment::{BlogCommentQuery, CreateCommentReplyInput},
        blog_review::{BlogReviewQuery, CreateBlogReviewInput},
    },
    repositories::{blog_comment_repo, blog_repo, blog_review_repo, user_repo},
    state::AppState,
};

pub async fn list_reviews(
    state: &AppState,
    blog_post_id: Uuid,
    query: &BlogReviewQuery,
) -> Result<serde_json::Value, AppError> {
    let (items, total, hearts_count) =
        blog_review_repo::find_by_blog_post(&state.db, blog_post_id, query).await?;
    let total_pages = (total + query.limit - 1) / query.limit;

    Ok(serde_json::json!({
        "items": items,
        "total": total,
        "page": query.page,
        "limit": query.limit,
        "total_pages": total_pages,
        "hearts_count": hearts_count,
    }))
}

pub async fn create_or_update_review(
    state: &AppState,
    user_id: Uuid,
    blog_post_id: Uuid,
    input: &CreateBlogReviewInput,
) -> Result<serde_json::Value, AppError> {
    if let Some(comment) = input.comment.as_ref() {
        if comment.trim().len() > 1_500 {
            return Err(AppError::BadRequest(
                "Bình luận tối đa 1500 ký tự".into(),
            ));
        }
    }

    let review = blog_review_repo::upsert(&state.db, user_id, blog_post_id, input).await?;
    Ok(serde_json::json!(review))
}

pub async fn get_my_review(
    state: &AppState,
    user_id: Uuid,
    blog_post_id: Uuid,
) -> Result<serde_json::Value, AppError> {
    let review = blog_review_repo::find_by_user_blog_post(&state.db, user_id, blog_post_id).await?;
    Ok(serde_json::json!(review))
}

pub async fn list_hearted_users(
    state: &AppState,
    blog_post_id: Uuid,
    query: &BlogReviewQuery,
) -> Result<serde_json::Value, AppError> {
    let (items, total) = blog_review_repo::find_hearted_users(&state.db, blog_post_id, query).await?;
    let total_pages = (total + query.limit - 1) / query.limit;

    Ok(serde_json::json!({
        "items": items,
        "total": total,
        "page": query.page,
        "limit": query.limit,
        "total_pages": total_pages,
    }))
}

pub async fn list_reviews_admin(
    state: &AppState,
    page: i64,
    limit: i64,
) -> Result<serde_json::Value, AppError> {
    let (items, total) = blog_review_repo::find_all_admin(&state.db, page, limit).await?;
    let total_pages = (total + limit - 1) / limit;

    Ok(serde_json::json!({
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }))
}

pub async fn delete_review(state: &AppState, id: Uuid) -> Result<(), AppError> {
    blog_review_repo::delete(&state.db, id).await
}

pub async fn get_post_thread_admin(
    state: &AppState,
    post_id: Uuid,
) -> Result<serde_json::Value, AppError> {
    let post = blog_repo::find_admin_by_id(&state.db, post_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Không tìm thấy bài viết".into()))?;

    let comment_query = BlogCommentQuery { page: 1, limit: 200 };
    let (comments, comments_total) =
        blog_comment_repo::find_comments_by_post(&state.db, post_id, &comment_query).await?;

    let hearts_query = BlogReviewQuery { page: 1, limit: 200 };
    let (hearts, hearts_total) = blog_review_repo::find_hearted_users(&state.db, post_id, &hearts_query).await?;

    let mut replies_map = serde_json::Map::new();
    for comment in &comments {
        let (replies, _) = blog_comment_repo::find_replies(&state.db, comment.id, &comment_query).await?;
        replies_map.insert(comment.id.to_string(), serde_json::json!(replies));
    }

    Ok(serde_json::json!({
        "post": {
            "id": post.id,
            "title": post.title,
            "slug": post.slug,
        },
        "hearts": {
            "total": hearts_total,
            "items": hearts,
        },
        "comments": {
            "total": comments_total,
            "items": comments,
        },
        "replies_by_comment_id": replies_map,
    }))
}

pub async fn admin_reply_comment(
    state: &AppState,
    admin: &AdminPublic,
    comment_id: Uuid,
    input: &CreateCommentReplyInput,
) -> Result<serde_json::Value, AppError> {
    let content = input.content.trim();
    if content.is_empty() {
        return Err(AppError::BadRequest("Nội dung phản hồi không được để trống".into()));
    }
    if content.chars().count() > 1500 {
        return Err(AppError::BadRequest("Phản hồi tối đa 1500 ký tự".into()));
    }

    let meta = blog_comment_repo::find_comment_meta(&state.db, comment_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Không tìm thấy bình luận gốc".into()))?;

    let system_user_id = user_repo::ensure_system_admin_user(&state.db, "Admin hệ thống").await?;

    let mut reply_to_reply_id = None;
    let mut reply_to_user_id = None;
    if let Some(target_reply_id) = input.reply_to_reply_id {
        let target_reply = blog_comment_repo::find_reply_meta(&state.db, target_reply_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Không tìm thấy phản hồi cần trả lời".into()))?;

        if target_reply.parent_review_id != comment_id {
            return Err(AppError::BadRequest(
                "Phản hồi mục tiêu không thuộc cùng bình luận gốc".into(),
            ));
        }

        reply_to_reply_id = Some(target_reply.id);
        reply_to_user_id = Some(target_reply.user_id);
    }

    let reply = blog_comment_repo::insert_reply(
        &state.db,
        meta.blog_post_id,
        comment_id,
        reply_to_reply_id,
        reply_to_user_id,
        system_user_id,
        content,
    )
    .await?;

    Ok(serde_json::json!({
        "reply": reply,
        "admin": {
            "id": admin.id,
            "name": admin.full_name,
        }
    }))
}

pub async fn admin_delete_comment(state: &AppState, comment_id: Uuid) -> Result<(), AppError> {
    blog_comment_repo::delete_comment(&state.db, comment_id).await
}

pub async fn admin_delete_reply(state: &AppState, reply_id: Uuid) -> Result<(), AppError> {
    blog_comment_repo::delete_reply(&state.db, reply_id).await
}
