use uuid::Uuid;

use crate::{
    error::AppError,
    models::{
        blog_comment::{BlogCommentQuery, CreateCommentReplyInput, ToggleCommentLikeResult},
        user::UserPublic,
    },
    repositories::blog_comment_repo,
    services::notification_service,
    state::AppState,
};

pub async fn list_comments(
    state: &AppState,
    blog_post_id: Uuid,
    query: &BlogCommentQuery,
) -> Result<serde_json::Value, AppError> {
    let (items, total) = blog_comment_repo::find_comments_by_post(&state.db, blog_post_id, query).await?;
    let total_pages = (total + query.limit - 1) / query.limit;

    Ok(serde_json::json!({
        "items": items,
        "total": total,
        "page": query.page,
        "limit": query.limit,
        "total_pages": total_pages,
    }))
}

pub async fn list_replies(
    state: &AppState,
    comment_id: Uuid,
    query: &BlogCommentQuery,
) -> Result<serde_json::Value, AppError> {
    let (items, total) = blog_comment_repo::find_replies(&state.db, comment_id, query).await?;
    let total_pages = (total + query.limit - 1) / query.limit;

    Ok(serde_json::json!({
        "items": items,
        "total": total,
        "page": query.page,
        "limit": query.limit,
        "total_pages": total_pages,
    }))
}

pub async fn create_reply(
    state: &AppState,
    actor: &UserPublic,
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

    let mut reply_to_reply_id = None;
    let mut reply_to_user_id = None;
    let mut notify_user_id = meta.user_id;

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
        notify_user_id = target_reply.user_id;
    }

    let reply = blog_comment_repo::insert_reply(
        &state.db,
        meta.blog_post_id,
        comment_id,
        reply_to_reply_id,
        reply_to_user_id,
        actor.id,
        content,
    )
    .await?;

    if notify_user_id != actor.id {
        let message = if reply_to_user_id.is_some() {
            format!("{} đã phản hồi trả lời của bạn", actor.name)
        } else {
            format!("{} đã trả lời bình luận của bạn", actor.name)
        };
        let _ = notification_service::push_user_notification(
            state,
            notify_user_id,
            "comment_reply",
            "Có phản hồi mới",
            &message,
            Some("blog_comment"),
            Some(comment_id),
            serde_json::json!({
                "blog_post_id": meta.blog_post_id,
                "comment_id": comment_id,
                "reply_id": reply.id,
                "reply_to_reply_id": reply_to_reply_id,
                "reply_to_user_id": reply_to_user_id,
            }),
        )
        .await;
    }

    Ok(serde_json::json!(reply))
}

pub async fn toggle_like(
    state: &AppState,
    actor: &UserPublic,
    comment_id: Uuid,
) -> Result<serde_json::Value, AppError> {
    let meta = blog_comment_repo::find_comment_meta(&state.db, comment_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Không tìm thấy bình luận".into()))?;

    let (liked, likes_count) = blog_comment_repo::toggle_comment_like(&state.db, comment_id, actor.id).await?;

    if liked && meta.user_id != actor.id {
        let message = format!("{} đã tim bình luận của bạn", actor.name);
        let _ = notification_service::push_user_notification(
            state,
            meta.user_id,
            "comment_like",
            "Bình luận được tim",
            &message,
            Some("blog_comment"),
            Some(comment_id),
            serde_json::json!({
                "blog_post_id": meta.blog_post_id,
                "comment_id": comment_id,
                "liked_by": actor.id,
            }),
        )
        .await;
    }

    Ok(serde_json::json!(ToggleCommentLikeResult {
        comment_id,
        liked,
        likes_count,
    }))
}

pub async fn list_my_liked_comment_ids(
    state: &AppState,
    user_id: Uuid,
    blog_post_id: Uuid,
) -> Result<serde_json::Value, AppError> {
    let ids = blog_comment_repo::find_liked_comment_ids_by_user(&state.db, blog_post_id, user_id).await?;
    Ok(serde_json::json!({ "ids": ids }))
}
