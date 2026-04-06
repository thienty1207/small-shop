use axum::{
    middleware,
    routing::{get, post},
    Router,
};

use crate::{
    handlers::client::{blog, blog_comment, blog_review},
    middleware::auth::jwt_auth,
    state::AppState,
};

/// Register public blog routes.
pub fn routes(state: AppState) -> Router<AppState> {
    let protected_reviews = Router::new()
        .route(
            "/api/blog/:post_id/reviews",
            post(blog_review::create_or_update_review),
        )
        .route(
            "/api/blog/:post_id/reviews/me",
            get(blog_review::get_my_review),
        )
        .route(
            "/api/blog/comments/:comment_id/replies",
            post(blog_comment::create_reply),
        )
        .route(
            "/api/blog/comments/:comment_id/likes/toggle",
            post(blog_comment::toggle_like),
        )
        .route(
            "/api/blog/:post_id/comments/likes/me",
            get(blog_comment::my_liked_comment_ids),
        )
        .route_layer(middleware::from_fn_with_state(state.clone(), jwt_auth));

    Router::new()
        .route("/api/blog", get(blog::list_posts))
        .route("/api/blog/tags", get(blog::list_tags))
        .route("/api/blog/:slug", get(blog::get_post))
        .route("/api/blog/:post_id/reviews", get(blog_review::list_reviews))
        .route("/api/blog/:post_id/hearts", get(blog_review::list_hearts))
        .route("/api/blog/:post_id/comments", get(blog_comment::list_comments))
        .route(
            "/api/blog/comments/:comment_id/replies",
            get(blog_comment::list_replies),
        )
        .merge(protected_reviews)
}
