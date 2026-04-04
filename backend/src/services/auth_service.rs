use std::sync::Arc;

use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use sqlx::PgPool;
use rand::RngCore;
use serde::{Deserialize, Serialize};

use crate::{
    config::Config,
    error::AppError,
    models::user::{Claims, GoogleUserInfo, NewUser, User},
    repositories::user_repo,
};

// ---------------------------------------------------------------------------
// Google OAuth helpers
// ---------------------------------------------------------------------------

const CSRF_COOKIE_NAME: &str = "oauth_state";
const CSRF_COOKIE_MAX_AGE_SECONDS: i64 = 10 * 60;

#[derive(Debug, Serialize, Deserialize)]
struct OAuthStateClaims {
    state: String,
    exp: i64,
    iat: i64,
}

/// Build the Google OAuth consent page URL.
/// Returns (authorization_url, csrf_state) — the caller must store csrf_state
/// in a short-lived cookie/session and validate it on callback.
///
/// SECURITY: The `state` parameter prevents CSRF attacks on the callback endpoint.
pub fn build_google_auth_url(config: &Config, state: &str) -> String {
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

    url
}

/// Generate a random OAuth CSRF state string.
pub fn generate_csrf_state() -> String {
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    bytes_to_hex(&bytes)
}

/// Build a signed, HttpOnly cookie that stores the OAuth state token.
pub fn build_csrf_cookie(config: &Config, state: &str) -> Result<String, AppError> {
    let now = Utc::now().timestamp();
    let claims = OAuthStateClaims {
        state: state.to_owned(),
        exp: now + CSRF_COOKIE_MAX_AGE_SECONDS,
        iat: now,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(config.csrf_cookie_key.as_bytes()),
    )
    .map_err(|e| AppError::Internal(format!("Failed to sign OAuth CSRF cookie: {e}")))?;

    Ok(format!(
        "{name}={value}; Path=/; HttpOnly; SameSite=Lax; Max-Age={max_age}{secure}",
        name = CSRF_COOKIE_NAME,
        value = token,
        max_age = CSRF_COOKIE_MAX_AGE_SECONDS,
        secure = cookie_secure_attr(config),
    ))
}

/// Build a deletion cookie for the OAuth state cookie.
pub fn clear_csrf_cookie(config: &Config) -> String {
    format!(
        "{name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0{secure}",
        name = CSRF_COOKIE_NAME,
        secure = cookie_secure_attr(config),
    )
}

/// Extract a named cookie value from a raw Cookie header string.
pub fn extract_cookie_value(cookie_header: Option<&str>, cookie_name: &str) -> Option<String> {
    cookie_header.and_then(|header| {
        header
            .split(';')
            .map(str::trim)
            .filter_map(|pair| pair.split_once('='))
            .find_map(|(name, value)| (name == cookie_name).then(|| value.to_owned()))
    })
}

/// Verify the callback state against the signed cookie token.
pub fn verify_csrf_state(
    config: &Config,
    cookie_token: Option<&str>,
    callback_state: Option<&str>,
) -> Result<(), AppError> {
    let cookie_token = cookie_token.ok_or_else(|| {
        AppError::BadRequest("Missing OAuth state cookie".into())
    })?;
    let callback_state = callback_state.ok_or_else(|| {
        AppError::BadRequest("Missing OAuth state parameter".into())
    })?;

    let claims = decode::<OAuthStateClaims>(
        cookie_token,
        &DecodingKey::from_secret(config.csrf_cookie_key.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| AppError::BadRequest("Invalid or expired OAuth state cookie".into()))?
    .claims;

    if claims.state != callback_state {
        return Err(AppError::BadRequest("OAuth state mismatch".into()));
    }

    Ok(())
}

fn cookie_secure_attr(config: &Config) -> &'static str {
    if config.frontend_url.starts_with("https://") || config.google_redirect_uri.starts_with("https://") {
        "; Secure"
    } else {
        ""
    }
}

fn bytes_to_hex(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";

    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push(HEX[(byte >> 4) as usize] as char);
        out.push(HEX[(byte & 0x0f) as usize] as char);
    }

    out
}

/// Exchange the authorization code returned by Google for an access token.
pub async fn exchange_code_for_token(config: &Config, code: &str) -> Result<String, AppError> {
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
pub async fn upsert_user(pool: &PgPool, google_info: GoogleUserInfo) -> Result<User, AppError> {
    if let Some(existing) = user_repo::find_by_google_id(pool, &google_info.id).await? {
        user_repo::update_last_login(pool, existing.id).await?;
        return Ok(existing);
    }

    if let Some(existing_email_user) = user_repo::find_by_email(pool, &google_info.email).await? {
        tracing::warn!(
            user_id = %existing_email_user.id,
            existing_google_id = %existing_email_user.google_id,
            incoming_google_id = %google_info.id,
            email = %google_info.email,
            "OAuth account conflict: same email linked to different Google account"
        );

        return Err(AppError::BadRequest(
            "Email này đã được liên kết với một tài khoản Google khác. Vui lòng dùng đúng tài khoản đã liên kết trước đó.".into(),
        ));
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
