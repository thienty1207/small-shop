use axum::{extract::State, http::StatusCode, Json};
use serde_json::json;

use crate::{
    error::AppError,
    models::contact::ContactRequest,
    services::contact_service,
    state::AppState,
};

/// POST /api/contact
///
/// Pipeline:
///   1. Validate request fields
///   2. Verify Cloudflare Turnstile token
///   3. Persist message to `contact_messages` table
///   4. Fire-and-forget: send admin notification + auto-reply to sender
pub async fn send_contact(
    State(state): State<AppState>,
    Json(payload): Json<ContactRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), AppError> {
    contact_service::process_contact(&state, payload).await?;

    Ok((
        StatusCode::OK,
        Json(json!({
            "message": "Your message has been sent! We will get back to you within 24 hours."
        })),
    ))
}
