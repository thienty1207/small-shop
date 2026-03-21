use validator::Validate;

use crate::{
    error::AppError,
    models::contact::ContactRequest,
    repositories::contact_repo,
    services::email_service,
    state::AppState,
};

/// Process the full client contact-form flow.
///
/// Steps:
/// 1. Validate payload using `validator` rules.
/// 2. Verify the Cloudflare Turnstile token.
/// 3. Persist the message in the database.
/// 4. Send admin notification + auto-reply emails in background (non-blocking).
pub async fn process_contact(state: &AppState, payload: ContactRequest) -> Result<(), AppError> {
    payload
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

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

    contact_repo::save_contact_message(
        &state.db,
        &payload.name,
        &payload.email,
        payload.phone.as_deref(),
        &payload.message,
        None,
    )
    .await?;

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

    Ok(())
}
