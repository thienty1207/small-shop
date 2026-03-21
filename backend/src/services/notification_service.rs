use crate::{error::AppError, state::AppState};

pub async fn count_recent_pending_orders(state: &AppState) -> Result<i64, AppError> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM orders WHERE status = 'pending' AND created_at > NOW() - INTERVAL '1 hour'",
    )
    .fetch_one(&state.db)
    .await?;

    Ok(count)
}
