use uuid::Uuid;

use crate::{
    error::AppError,
    models::review::{CreateReviewInput, ReviewQuery},
    repositories::review_repo,
    state::AppState,
};

/// List reviews for a `product_id` with pagination.
pub async fn list_reviews(
    state: &AppState,
    product_id: Uuid,
    query: &ReviewQuery,
) -> Result<serde_json::Value, AppError> {
    let (items, total) = review_repo::find_by_product(&state.db, product_id, query).await?;
    let total_pages = (total + query.limit - 1) / query.limit;

    Ok(serde_json::json!({
        "items":       items,
        "total":       total,
        "page":        query.page,
        "limit":       query.limit,
        "total_pages": total_pages,
    }))
}

/// Create or update the current user's review for a product (upsert).
pub async fn create_review(
    state: &AppState,
    user_id: Uuid,
    product_id: Uuid,
    input: &CreateReviewInput,
) -> Result<serde_json::Value, AppError> {
    let review = review_repo::upsert(&state.db, user_id, product_id, input).await?;
    Ok(serde_json::json!(review))
}

/// Get the current user's own review for a product.
pub async fn get_my_review(
    state: &AppState,
    user_id: Uuid,
    product_id: Uuid,
) -> Result<serde_json::Value, AppError> {
    let review = review_repo::find_by_user_product(&state.db, user_id, product_id).await?;
    Ok(serde_json::json!(review))
}

/// List reviews for admin by page and limit.
pub async fn list_reviews_admin(
    state: &AppState,
    page: i64,
    limit: i64,
) -> Result<serde_json::Value, AppError> {
    let (items, total) = review_repo::find_all_admin(&state.db, page, limit).await?;
    let total_pages = (total + limit - 1) / limit;
    Ok(serde_json::json!({
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }))
}

/// Delete a review by `id` (admin moderation action).
pub async fn delete_review(state: &AppState, id: Uuid) -> Result<(), AppError> {
    review_repo::delete(&state.db, id).await
}
