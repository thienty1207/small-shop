# Authentication

JWT and OAuth 2.1 authentication patterns for Axum.

## JWT Authentication

### Dependencies

```toml
[dependencies]
jsonwebtoken = "9"
argon2 = "0.5"
rand = "0.8"
```

### JWT Token Creation

```rust
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey, Algorithm};
use serde::{Deserialize, Serialize};
use chrono::{Utc, Duration};

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,           // User ID
    pub email: String,
    pub role: String,
    pub exp: usize,          // Expiration time
    pub iat: usize,          // Issued at
}

pub struct JwtService {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
}

impl JwtService {
    pub fn new(secret: &str) -> Self {
        Self {
            encoding_key: EncodingKey::from_secret(secret.as_bytes()),
            decoding_key: DecodingKey::from_secret(secret.as_bytes()),
        }
    }
    
    pub fn create_token(&self, user: &User) -> Result<String, AppError> {
        let now = Utc::now();
        let expires = now + Duration::hours(24);
        
        let claims = Claims {
            sub: user.id,
            email: user.email.clone(),
            role: user.role.to_string(),
            exp: expires.timestamp() as usize,
            iat: now.timestamp() as usize,
        };
        
        encode(&Header::default(), &claims, &self.encoding_key)
            .map_err(|e| AppError::Internal(e.to_string()))
    }
    
    pub fn verify_token(&self, token: &str) -> Result<Claims, AppError> {
        let validation = Validation::new(Algorithm::HS256);
        
        decode::<Claims>(token, &self.decoding_key, &validation)
            .map(|data| data.claims)
            .map_err(|_| AppError::Unauthorized)
    }
}
```

### Password Hashing

```rust
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};

pub async fn hash_password(password: &str) -> Result<String, AppError> {
    let password = password.to_string();
    
    tokio::task::spawn_blocking(move || {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        
        argon2.hash_password(password.as_bytes(), &salt)
            .map(|hash| hash.to_string())
            .map_err(|e| AppError::Internal(e.to_string()))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

pub async fn verify_password(password: &str, hash: &str) -> Result<bool, AppError> {
    let password = password.to_string();
    let hash = hash.to_string();
    
    tokio::task::spawn_blocking(move || {
        let parsed_hash = PasswordHash::new(&hash)
            .map_err(|_| AppError::Internal("Invalid hash".into()))?;
        
        Ok(Argon2::default()
            .verify_password(password.as_bytes(), &parsed_hash)
            .is_ok())
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}
```

### Login Handler

```rust
#[derive(Deserialize)]
pub struct LoginInput {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: UserResponse,
}

pub async fn login(
    State(state): State<AppState>,
    Json(input): Json<LoginInput>,
) -> Result<Json<LoginResponse>, AppError> {
    // Find user
    let user = sqlx::query_as!(User,
        "SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = $1",
        input.email
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::Unauthorized)?;
    
    // Verify password
    let password_hash = user.password_hash
        .as_ref()
        .ok_or(AppError::Unauthorized)?;
    
    if !verify_password(&input.password, password_hash).await? {
        return Err(AppError::Unauthorized);
    }
    
    // Generate token
    let token = state.jwt.create_token(&user)?;
    
    Ok(Json(LoginResponse {
        token,
        user: user.into(),
    }))
}
```

### Auth Middleware

```rust
use axum::{
    middleware::Next,
    http::Request,
    response::Response,
    body::Body,
};

pub async fn auth_middleware(
    State(state): State<AppState>,
    mut request: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    // Extract token
    let token = request
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "))
        .ok_or(AppError::Unauthorized)?;
    
    // Verify token
    let claims = state.jwt.verify_token(token)?;
    
    // Create current user
    let current_user = CurrentUser {
        id: claims.sub,
        email: claims.email,
        role: claims.role.parse().unwrap_or_default(),
    };
    
    // Add to request extensions
    request.extensions_mut().insert(current_user);
    
    Ok(next.run(request).await)
}
```

### Current User Extractor

```rust
#[derive(Clone, Debug)]
pub struct CurrentUser {
    pub id: Uuid,
    pub email: String,
    pub role: Role,
}

#[async_trait]
impl<S> FromRequestParts<S> for CurrentUser
where
    S: Send + Sync,
{
    type Rejection = AppError;
    
    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        parts.extensions
            .get::<CurrentUser>()
            .cloned()
            .ok_or(AppError::Unauthorized)
    }
}

// Usage in handlers
pub async fn get_profile(user: CurrentUser) -> Json<UserResponse> {
    Json(UserResponse {
        id: user.id,
        email: user.email,
        role: user.role,
    })
}
```

---

## Role-Based Access Control (RBAC)

### Role Definition

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    Admin = 3,
    Moderator = 2,
    #[default]
    User = 1,
    Guest = 0,
}

impl FromStr for Role {
    type Err = ();
    
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "admin" => Ok(Role::Admin),
            "moderator" => Ok(Role::Moderator),
            "user" => Ok(Role::User),
            "guest" => Ok(Role::Guest),
            _ => Ok(Role::User),
        }
    }
}
```

### Role Check Middleware

```rust
use std::future::Future;

pub fn require_role<F, Fut>(
    required_role: Role,
) -> impl Fn(CurrentUser, Request<Body>, Next) -> impl Future<Output = Result<Response, AppError>> + Clone
where
    F: Fn(CurrentUser, Request<Body>, Next) -> Fut + Clone,
    Fut: Future<Output = Result<Response, AppError>>,
{
    move |user: CurrentUser, request: Request<Body>, next: Next| {
        let required = required_role;
        async move {
            if user.role < required {
                return Err(AppError::Forbidden);
            }
            Ok(next.run(request).await)
        }
    }
}

// Simpler approach with decorator pattern
pub async fn admin_only(
    user: CurrentUser,
    request: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    if user.role != Role::Admin {
        return Err(AppError::Forbidden);
    }
    Ok(next.run(request).await)
}
```

### Route Protection

```rust
// Protected routes
let protected = Router::new()
    .route("/profile", get(get_profile))
    .route("/settings", get(get_settings).put(update_settings))
    .route_layer(middleware::from_fn_with_state(state.clone(), auth_middleware));

// Admin routes
let admin = Router::new()
    .route("/users", get(list_all_users))
    .route("/users/:id", delete(delete_user))
    .route_layer(middleware::from_fn(admin_only))
    .route_layer(middleware::from_fn_with_state(state.clone(), auth_middleware));

let app = Router::new()
    .merge(public_routes)
    .nest("/api", protected)
    .nest("/admin", admin);
```

---

## OAuth 2.1 / PKCE

### OAuth Configuration

```rust
pub struct OAuthConfig {
    pub client_id: String,
    pub client_secret: String,
    pub redirect_uri: String,
    pub auth_url: String,
    pub token_url: String,
    pub user_info_url: String,
}

#[derive(Deserialize)]
pub struct OAuthCallback {
    pub code: String,
    pub state: String,
}

#[derive(Deserialize)]
pub struct OAuthTokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: Option<u64>,
    pub refresh_token: Option<String>,
}

#[derive(Deserialize)]
pub struct OAuthUserInfo {
    pub id: String,
    pub email: String,
    pub name: Option<String>,
}
```

### OAuth Flow Handlers

```rust
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use sha2::{Sha256, Digest};
use rand::RngCore;

// Generate PKCE code verifier
fn generate_code_verifier() -> String {
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

// Generate code challenge from verifier
fn generate_code_challenge(verifier: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    URL_SAFE_NO_PAD.encode(hasher.finalize())
}

// Start OAuth flow
pub async fn oauth_login(
    State(state): State<AppState>,
) -> impl IntoResponse {
    let verifier = generate_code_verifier();
    let challenge = generate_code_challenge(&verifier);
    let state_param = Uuid::new_v4().to_string();
    
    // Store verifier in session/cache
    state.cache.set(
        format!("oauth:{}", state_param),
        verifier,
        Duration::from_secs(300)
    ).await;
    
    let auth_url = format!(
        "{}?client_id={}&redirect_uri={}&response_type=code&scope=openid%20email%20profile&state={}&code_challenge={}&code_challenge_method=S256",
        state.oauth.auth_url,
        state.oauth.client_id,
        urlencoding::encode(&state.oauth.redirect_uri),
        state_param,
        challenge,
    );
    
    Redirect::temporary(&auth_url)
}

// Handle OAuth callback
pub async fn oauth_callback(
    State(state): State<AppState>,
    Query(params): Query<OAuthCallback>,
) -> Result<Json<LoginResponse>, AppError> {
    // Get code verifier from cache
    let verifier = state.cache
        .get(&format!("oauth:{}", params.state))
        .await
        .ok_or(AppError::Unauthorized)?;
    
    // Exchange code for token
    let client = reqwest::Client::new();
    let token_response: OAuthTokenResponse = client
        .post(&state.oauth.token_url)
        .form(&[
            ("grant_type", "authorization_code"),
            ("code", &params.code),
            ("redirect_uri", &state.oauth.redirect_uri),
            ("client_id", &state.oauth.client_id),
            ("client_secret", &state.oauth.client_secret),
            ("code_verifier", &verifier),
        ])
        .send()
        .await?
        .json()
        .await?;
    
    // Get user info
    let user_info: OAuthUserInfo = client
        .get(&state.oauth.user_info_url)
        .bearer_auth(&token_response.access_token)
        .send()
        .await?
        .json()
        .await?;
    
    // Find or create user
    let user = find_or_create_oauth_user(&state.db, user_info).await?;
    
    // Generate our JWT
    let token = state.jwt.create_token(&user)?;
    
    Ok(Json(LoginResponse { token, user: user.into() }))
}
```

---

## Refresh Tokens

```rust
#[derive(Serialize)]
pub struct TokenPair {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: u64,
}

impl JwtService {
    pub fn create_token_pair(&self, user: &User) -> Result<TokenPair, AppError> {
        // Short-lived access token (15 min)
        let access_token = self.create_access_token(user)?;
        
        // Long-lived refresh token (7 days)
        let refresh_token = self.create_refresh_token(user)?;
        
        Ok(TokenPair {
            access_token,
            refresh_token,
            expires_in: 900, // 15 minutes
        })
    }
    
    fn create_access_token(&self, user: &User) -> Result<String, AppError> {
        let claims = Claims {
            sub: user.id,
            email: user.email.clone(),
            role: user.role.to_string(),
            exp: (Utc::now() + Duration::minutes(15)).timestamp() as usize,
            iat: Utc::now().timestamp() as usize,
            token_type: "access".to_string(),
        };
        
        encode(&Header::default(), &claims, &self.encoding_key)
            .map_err(|e| AppError::Internal(e.to_string()))
    }
    
    fn create_refresh_token(&self, user: &User) -> Result<String, AppError> {
        let claims = RefreshClaims {
            sub: user.id,
            exp: (Utc::now() + Duration::days(7)).timestamp() as usize,
            iat: Utc::now().timestamp() as usize,
            token_type: "refresh".to_string(),
        };
        
        encode(&Header::default(), &claims, &self.encoding_key)
            .map_err(|e| AppError::Internal(e.to_string()))
    }
}

// Refresh endpoint
pub async fn refresh_token(
    State(state): State<AppState>,
    Json(input): Json<RefreshInput>,
) -> Result<Json<TokenPair>, AppError> {
    // Verify refresh token
    let claims = state.jwt.verify_refresh_token(&input.refresh_token)?;
    
    // Get user (ensure still valid)
    let user = sqlx::query_as!(User,
        "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
        claims.sub
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::Unauthorized)?;
    
    // Issue new token pair
    let tokens = state.jwt.create_token_pair(&user)?;
    
    Ok(Json(tokens))
}
```

---

## Session Management

For stateful authentication with PostgreSQL:

```rust
// sessions table
// CREATE TABLE sessions (
//     id UUID PRIMARY KEY,
//     user_id UUID NOT NULL REFERENCES users(id),
//     token_hash VARCHAR(255) NOT NULL,
//     expires_at TIMESTAMPTZ NOT NULL,
//     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
// );

pub struct SessionService {
    pool: PgPool,
}

impl SessionService {
    pub async fn create(&self, user_id: Uuid) -> Result<String, AppError> {
        let token = Uuid::new_v4().to_string();
        let token_hash = hash_token(&token);
        let expires_at = Utc::now() + Duration::days(30);
        
        sqlx::query!(
            "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
            Uuid::new_v4(),
            user_id,
            token_hash,
            expires_at
        )
        .execute(&self.pool)
        .await?;
        
        Ok(token)
    }
    
    pub async fn validate(&self, token: &str) -> Result<Uuid, AppError> {
        let token_hash = hash_token(token);
        
        let session = sqlx::query!(
            "SELECT user_id FROM sessions WHERE token_hash = $1 AND expires_at > NOW()",
            token_hash
        )
        .fetch_optional(&self.pool)
        .await?
        .ok_or(AppError::Unauthorized)?;
        
        Ok(session.user_id)
    }
    
    pub async fn revoke(&self, token: &str) -> Result<(), AppError> {
        let token_hash = hash_token(token);
        sqlx::query!("DELETE FROM sessions WHERE token_hash = $1", token_hash)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
```
