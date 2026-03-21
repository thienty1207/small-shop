use crate::{error::AppError, state::AppState};

/// Count `pending` orders created within the last hour.
///
/// Used by admin notification channels (SSE/polling) to surface new-order signals.
pub async fn count_recent_pending_orders(state: &AppState) -> Result<i64, AppError> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM orders WHERE status = 'pending' AND created_at > NOW() - INTERVAL '1 hour'",
    )
    .fetch_one(&state.db)
    .await?;

    Ok(count)
}
