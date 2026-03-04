use std::sync::Arc;

use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use sqlx::PgPool;

use crate::{
    config::Config,
    error::AppError,
    models::user::{Claims, GoogleUserInfo, NewUser, User},
    repositories::user_repo,
};

// ---------------------------------------------------------------------------
// Google OAuth helpers
// ---------------------------------------------------------------------------

/// Build the Google OAuth consent page URL.
/// Returns (authorization_url, csrf_state) — the caller must store csrf_state
/// in a short-lived cookie/session and validate it on callback.
///
/// SECURITY: The `state` parameter prevents CSRF attacks on the callback endpoint.
/// TODO: Store state in a signed, short-lived cookie before redirecting.
pub fn build_google_auth_url(config: &Config) -> (String, String) {
    let state = generate_csrf_state();

    let url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth\
         ?client_id={client_id}\
         &redirect_uri={redirect_uri}\
         &response_type=code\
         &scope=openid%20email%20profile\
         &access_type=offline\
         &state={state}",
        client_id = config.google_client_id,
        redirect_uri = urlencoding::encode(&config.google_redirect_uri),
        state = state,
    );

    (url, state)
}

/// Exchange the authorization code returned by Google for an access token.
pub async fn exchange_code_for_token(
    config: &Config,
    code: &str,
) -> Result<String, AppError> {
    let client = reqwest::Client::new();

    let params = [
        ("code", code),
        ("client_id", config.google_client_id.as_str()),
        ("client_secret", config.google_client_secret.as_str()),
        ("redirect_uri", config.google_redirect_uri.as_str()),
        ("grant_type", "authorization_code"),
    ];

    let response = client
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        tracing::error!("Google token exchange failed: {body}");
        return Err(AppError::Unauthorized(
            "Failed to exchange Google authorization code".into(),
        ));
    }

    let token_data: serde_json::Value = response.json().await?;

    token_data["access_token"]
        .as_str()
        .map(|s| s.to_owned())
        .ok_or_else(|| AppError::Internal("Missing access_token in Google response".into()))
}

/// Fetch the authenticated user's profile from Google's userinfo endpoint.
pub async fn fetch_google_user_info(access_token: &str) -> Result<GoogleUserInfo, AppError> {
    let client = reqwest::Client::new();

    let info = client
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
        .bearer_auth(access_token)
        .send()
        .await?
        .json::<GoogleUserInfo>()
        .await?;

    Ok(info)
}

// ---------------------------------------------------------------------------
// User upsert
// ---------------------------------------------------------------------------

/// Find or create a user based on their Google profile.
/// Also updates `last_login_at` on every successful login.
///
/// SECURITY: We intentionally do NOT merge accounts that have the same email
/// but different google_id — to prevent account takeover via email spoofing.
/// TODO: If same email + different google_id is detected, surface a clear error.
pub async fn upsert_user(
    pool: &PgPool,
    google_info: GoogleUserInfo,
) -> Result<User, AppError> {
    if let Some(existing) = user_repo::find_by_google_id(pool, &google_info.id).await? {
        user_repo::update_last_login(pool, existing.id).await?;
        return Ok(existing);
    }

    // New user — insert and stamp last_login_at
    let new_user = user_repo::insert_user(
        pool,
        NewUser {
            google_id: google_info.id,
            email: google_info.email,
            name: google_info.name,
            avatar_url: google_info.picture,
        },
    )
    .await?;

    user_repo::update_last_login(pool, new_user.id).await?;

    Ok(new_user)
}

// ---------------------------------------------------------------------------
// JWT
// ---------------------------------------------------------------------------

/// Sign a JWT for the given user.
///
/// SECURITY: Uses HS256. The secret must be >= 32 bytes of random entropy.
/// TODO: Consider RS256 with rotating key pairs for production.
pub fn generate_jwt(config: &Config, user: &User) -> Result<String, AppError> {
    let now = Utc::now().timestamp();
    let expiry = now + config.jwt_expiration_hours * 3600;

    let claims = Claims {
        sub: user.id.to_string(),
        email: user.email.clone(),
        name: user.name.clone(),
        role: user.role.clone(),
        exp: expiry,
        iat: now,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(config.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(format!("JWT signing error: {e}")))
}

/// Verify and decode a JWT, returning the claims on success.
///
/// SECURITY: Returns Unauthorized on expiry, invalid signature, or malformed token.
/// Never expose internal error details to the client.
pub fn verify_jwt(config: &Arc<Config>, token: &str) -> Result<Claims, AppError> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(config.jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|e| {
        tracing::warn!("JWT verification failed: {e}");
        AppError::Unauthorized("Invalid or expired token".into())
    })
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

fn generate_csrf_state() -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    use std::time::SystemTime;

    // Simple random-enough state for development.
    // TODO: Replace with `rand::thread_rng().gen::<[u8; 32]>()` hex-encoded for production.
    let mut hasher = DefaultHasher::new();
    SystemTime::now().hash(&mut hasher);
    format!("{:x}", hasher.finish())
}
