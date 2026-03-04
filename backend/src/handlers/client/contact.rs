use axum::{extract::State, http::StatusCode, Json};
use serde_json::json;
use validator::Validate;

use crate::{
    error::AppError,
    models::contact::ContactRequest,
    repositories::contact_repo,
    services::email_service,
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
    // ── 1. Input validation ─────────────────────────────────────────────────
    payload
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

    // ── 2. Cloudflare Turnstile ─────────────────────────────────────────────
    let valid = email_service::verify_turnstile(
        &state.config.cloudflare_secret_key,
        &payload.cf_turnstile_response,
    )
    .await?;

    if !valid {
        return Err(AppError::BadRequest(
            "Cloudflare verification failed. Please try again.".into(),
        ));
    }

    // ── 3. Persist to database ──────────────────────────────────────────────
    contact_repo::save_contact_message(
        &state.db,
        &payload.name,
        &payload.email,
        payload.phone.as_deref(),
        &payload.message,
        None, // IP address (extend with ConnectInfo if needed)
    )
    .await?;

    // ── 4. Send emails (fire-and-forget, non-blocking) ──────────────────────
    let config = state.config.clone();
    let name = payload.name.clone();
    let email = payload.email.clone();
    let phone = payload.phone.clone();
    let message = payload.message.clone();

    if let Some(mailer) = state.mailer.clone() {
        tokio::spawn(async move {
            if let Err(e) = email_service::send_admin_notification(
                &config,
                &mailer,
                &name,
                &email,
                phone.as_deref(),
                &message,
            )
            .await
            {
                tracing::error!("Admin notification failed: {e}");
            }

            if let Err(e) = email_service::send_auto_reply(&config, &mailer, &name, &email).await {
                tracing::error!("Auto-reply failed: {e}");
            }
        });
    }

    Ok((
        StatusCode::OK,
        Json(json!({
            "message": "Your message has been sent! We will get back to you within 24 hours."
        })),
    ))
}
