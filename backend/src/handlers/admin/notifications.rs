use axum::{
    extract::State,
    response::sse::{Event, KeepAlive, Sse},
    Extension,
};
use futures::StreamExt;
use std::convert::Infallible;
use tokio::time::{interval, Duration};
use tokio_stream::wrappers::IntervalStream;

use crate::{
    error::AppError,
    models::admin::AdminPublic,
    services::{notification_service, permissions_service},
    state::AppState,
};

/// GET /api/admin/notifications/stream
///
/// Server-Sent Events endpoint: polls for recent pending orders every 10 s
/// and pushes a `new_order` event when there are unread ones.
///
/// Kept stateless (no subscription registry) to stay simple — the client
/// re-fetches a count endpoint on each event.
pub async fn notification_stream(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
) -> Result<Sse<impl futures::Stream<Item = Result<Event, Infallible>>>, AppError> {
    permissions_service::require_permission(&state, &admin, "notifications.view").await?;
    let app_state = state.clone();

    let tick = IntervalStream::new(interval(Duration::from_secs(10)));

    let stream = tick.then(move |_| {
        let state = app_state.clone();
        async move {
            let count = notification_service::count_recent_pending_orders(&state)
                .await
                .unwrap_or(0);

            Ok::<Event, Infallible>(
                Event::default()
                    .event("ping")
                    .data(serde_json::json!({ "pending_orders": count }).to_string()),
            )
        }
    });

    Ok(Sse::new(stream).keep_alive(KeepAlive::default()))
}
