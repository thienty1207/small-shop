use axum::{routing::post, Router};

use crate::{handlers::client::contact, state::AppState};

/// Mount all contact-related routes.
///
/// POST /api/contact — submit a contact form (Turnstile-protected)
pub fn routes(_state: AppState) -> Router<AppState> {
    Router::new().route("/api/contact", post(contact::send_contact))
}
