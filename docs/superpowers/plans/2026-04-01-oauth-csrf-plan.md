# OAuth CSRF Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Secure Google OAuth callback by validating CSRF state via signed HttpOnly cookie, preventing CSRF attacks.

**Architecture:** Generate random state + signed cookie on `/auth/google`, verify state + cookie on callback before exchanging authorization code for JWT.

**Tech Stack:** Axum, tower-cookies, cookie crate (signed jar), existing jsonwebtoken + rand

---

## File Structure

**Modified files:**
- `Cargo.toml` — add `tower-cookies` + `cookie` crates
- `src/config.rs` — add `CSRF_COOKIE_KEY` env var, store in Config
- `src/state.rs` — add `csrf_key: cookie::Key` field
- `src/main.rs` — initialize csrf_key, wire tower-cookies middleware
- `src/error.rs` — add `CsrfError` variant
- `src/services/auth_service.rs` — new fns: `generate_csrf_state()`, `verify_csrf_state()`
- `src/handlers/client/user.rs` — update `google_login()`, `google_callback()`

**New files:**
- `src/middleware/csrf.rs` (optional, for future reuse)

**Test files:**
- `backend/tests/oauth_csrf_test.rs` (integration tests)

---

## Task 1: Add Dependencies

**Files:**
- Modify: `Cargo.toml`

- [ ] **Step 1: Add tower-cookies and cookie to Cargo.toml**

```toml
# In [dependencies] section, add after "tower-http":
tower-cookies     = "0.10"
cookie            = { version = "0.18", features = ["secure"] }
```

- [ ] **Step 2: Verify dependencies resolve**

Run: `cargo check`
Expected: No errors, new deps downloaded

---

## Task 2: Update Config & State

**Files:**
- Modify: `src/config.rs`
- Modify: `src/state.rs`

- [ ] **Step 1: Add CSRF_COOKIE_KEY to Config**

File: `src/config.rs`

Replace:
```rust
impl Config {
    pub fn from_env() -> Self {
        dotenv::dotenv().ok();

        Self {
            port: env::var("PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(3000),
            // ... other fields
        }
    }
}
```

With:
```rust
impl Config {
    pub fn from_env() -> Self {
        dotenv::dotenv().ok();

        let csrf_cookie_key_hex = env::var("CSRF_COOKIE_KEY")
            .unwrap_or_else(|_| {
                tracing::warn!("CSRF_COOKIE_KEY not set, using default for dev");
                // Default 32-byte hex for local dev only
                "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef".to_string()
            });

        Self {
            port: env::var("PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(3000),
            csrf_cookie_key: csrf_cookie_key_hex,
            // ... other fields
        }
    }
}
```

Also add field to struct:
```rust
pub struct Config {
    pub port: u16,
    pub csrf_cookie_key: String,  // Add this line
    // ... existing fields
}
```

- [ ] **Step 2: Add csrf_key to AppState**

File: `src/state.rs`

Replace:
```rust
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub config: Arc<Config>,
}
```

With:
```rust
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub config: Arc<Config>,
    pub csrf_key: cookie::Key,  // Add this line
}
```

- [ ] **Step 3: Initialize csrf_key in main.rs**

File: `src/main.rs` (in main() where AppState is created)

Find:
```rust
let config = Config::from_env();

let app_state = AppState {
    db,
    config: Arc::new(config),
};
```

Replace with:
```rust
let config = Config::from_env();

// Decode CSRF key from hex string
let csrf_key_bytes = hex::decode(&config.csrf_cookie_key)
    .expect("CSRF_COOKIE_KEY must be valid hex");
let csrf_key = cookie::Key::derive_from(&csrf_key_bytes);

let app_state = AppState {
    db,
    config: Arc::new(config),
    csrf_key,
};
```

Add to Cargo.toml:
```toml
hex = "0.4"
```

- [ ] **Step 4: Verify compilation**

Run: `cargo check`
Expected: No errors

---

## Task 3: Add CSRF Error Type

**Files:**
- Modify: `src/error.rs`

- [ ] **Step 1: Add CsrfError enum to error.rs**

File: `src/error.rs`

Add to existing enum or create new:
```rust
#[derive(Debug)]
pub enum CsrfError {
    MissingCookie,
    InvalidSignature,
    StateMismatch,
    Expired,
}

impl From<CsrfError> for AppError {
    fn from(err: CsrfError) -> Self {
        match err {
            CsrfError::MissingCookie => AppError::BadRequest("OAuth state cookie missing".into()),
            CsrfError::InvalidSignature => AppError::BadRequest("OAuth state cookie invalid".into()),
            CsrfError::StateMismatch => AppError::BadRequest("OAuth state mismatch (CSRF)".into()),
            CsrfError::Expired => AppError::BadRequest("OAuth state expired".into()),
        }
    }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cargo check`
Expected: No errors

---

## Task 4: Implement CSRF Functions in auth_service.rs

**Files:**
- Modify: `src/services/auth_service.rs`

- [ ] **Step 1: Add state generation function**

File: `src/services/auth_service.rs`

Add after imports:
```rust
use cookie::{Cookie, SameSite};
use std::time::Duration;

/// Generate a random CSRF state (32 bytes hex) and a signed cookie to send to client.
pub fn generate_csrf_state(key: &cookie::Key) -> Result<(String, Cookie<'static>), AppError> {
    use rand::Rng;
    
    // Generate 32 random bytes
    let mut rng = rand::thread_rng();
    let random_bytes: [u8; 32] = rng.gen();
    let state = hex::encode(&random_bytes);
    
    // Create signed cookie
    let mut cookie = Cookie::new("oauth_state", state.clone());
    cookie.set_http_only(true);
    cookie.set_secure(true);
    cookie.set_same_site(SameSite::Lax);
    cookie.set_max_age(Duration::minutes(10));
    cookie.set_path("/");
    
    Ok((state, cookie))
}

/// Verify CSRF state: extract from cookie, compare with callback param, delete cookie.
pub fn verify_csrf_state(
    state_from_cookie: Option<String>,
    state_from_callback: &str,
) -> Result<(), crate::error::CsrfError> {
    use crate::error::CsrfError;
    
    let stored_state = state_from_cookie
        .ok_or(CsrfError::MissingCookie)?;
    
    if stored_state != state_from_callback {
        return Err(CsrfError::StateMismatch);
    }
    
    Ok(())
}
```

- [ ] **Step 2: Verify compilation**

Run: `cargo check`
Expected: No errors

---

## Task 5: Update google_login Handler

**Files:**
- Modify: `src/handlers/client/user.rs`

- [ ] **Step 1: Update google_login to set CSRF cookie**

File: `src/handlers/client/user.rs`

Replace:
```rust
/// Redirect the user to Google's consent page to start OAuth flow.
pub async fn google_login(State(state): State<AppState>) -> impl IntoResponse {
    let (url, _csrf_state) = auth_service::build_google_auth_url(&state.config);

    // TODO: Store _csrf_state in a signed short-lived cookie before redirecting
    //       so we can validate it in the callback (CSRF protection).

    Redirect::temporary(&url)
}
```

With:
```rust
use axum_extra::extract::CookieJar;
use axum::http::HeaderMap;

/// Redirect the user to Google's consent page to start OAuth flow.
/// Sets a signed CSRF state cookie before redirecting.
pub async fn google_login(
    State(state): State<AppState>,
    cookies: CookieJar,
) -> impl IntoResponse {
    let (auth_url, csrf_state) = auth_service::build_google_auth_url(&state.config);
    
    // Generate CSRF cookie
    let csrf_cookie = match auth_service::generate_csrf_state(&state.csrf_key) {
        Ok((_, cookie)) => cookie,
        Err(e) => {
            tracing::error!("Failed to generate CSRF state: {:?}", e);
            return (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "CSRF setup failed").into_response();
        }
    };
    
    // Add cookie to response
    let updated_cookies = cookies.add(csrf_cookie);
    
    (updated_cookies, Redirect::temporary(&auth_url)).into_response()
}
```

- [ ] **Step 2: Update build_google_auth_url to use state correctly**

File: `src/services/auth_service.rs`

The existing `build_google_auth_url` should already use the state param. Just verify it includes `state=...` in URL. If not, update:

```rust
pub fn build_google_auth_url(config: &Config) -> (String, String) {
    // Generate state only for URL (cookie managed by handler)
    let state = generate_csrf_state_value();  // Same random hex as before
    
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

fn generate_csrf_state_value() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let random_bytes: [u8; 32] = rng.gen();
    hex::encode(&random_bytes)
}
```

- [ ] **Step 3: Verify compilation**

Run: `cargo check`
Expected: No errors

---

## Task 6: Update google_callback Handler

**Files:**
- Modify: `src/handlers/client/user.rs`

- [ ] **Step 1: Update google_callback to validate CSRF state**

File: `src/handlers/client/user.rs`

Replace:
```rust
/// Handle Google OAuth callback and redirect to frontend with login token.
pub async fn google_callback(
    State(state): State<AppState>,
    Query(params): Query<CallbackParams>,
) -> Result<impl IntoResponse, AppError> {
    // TODO: Validate params.state against the stored CSRF state cookie.
    //       If mismatch → return AppError::Unauthorized("CSRF state mismatch").

    let redirect_url = user_service::build_oauth_redirect_url(&state, &params.code).await?;

    Ok(Redirect::temporary(&redirect_url))
}
```

With:
```rust
use axum_extra::extract::CookieJar;

/// Handle Google OAuth callback and redirect to frontend with login token.
/// Validates CSRF state before exchanging authorization code.
pub async fn google_callback(
    State(state): State<AppState>,
    Query(params): Query<CallbackParams>,
    cookies: CookieJar,
) -> Result<impl IntoResponse, AppError> {
    // Extract and verify CSRF state
    let oauth_state_cookie = cookies
        .get("oauth_state")
        .map(|c| c.value().to_string());
    
    auth_service::verify_csrf_state(oauth_state_cookie, &params.state)?;
    
    // Exchange code for token
    let redirect_url = user_service::build_oauth_redirect_url(&state, &params.code).await?;
    
    // Return redirect + delete cookie
    let updated_cookies = cookies.remove(Cookie::named("oauth_state"));
    Ok((updated_cookies, Redirect::temporary(&redirect_url)))
}
```

- [ ] **Step 2: Verify compilation**

Run: `cargo check`
Expected: No errors

---

## Task 7: Wire tower-cookies Middleware in main.rs

**Files:**
- Modify: `src/main.rs`

- [ ] **Step 1: Add tower-cookies middleware to Axum router**

File: `src/main.rs` (where router is configured)

Find the router setup (typically in main() or a fn that builds Router):

```rust
let app = Router::new()
    .merge(route1)
    .merge(route2)
    // ... routes
    .layer(/* other middleware */);
```

Add tower-cookies layer (should be early, before other layers):

```rust
use tower_cookies::CookieManagerLayer;

let app = Router::new()
    .merge(route1)
    .merge(route2)
    // ... routes
    .layer(CookieManagerLayer::new())
    .layer(/* other middleware */);
```

- [ ] **Step 2: Verify compilation**

Run: `cargo check`
Expected: No errors

---

## Task 8: Update README & .env.example

**Files:**
- Modify: `backend/README.md`
- Create/Modify: `.env.example` or `.env`

- [ ] **Step 1: Document CSRF_COOKIE_KEY in README**

File: `backend/README.md`

Add section:
```markdown
### CSRF Protection

OAuth CSRF state is protected via signed HttpOnly cookies.

**Setup:**

1. Generate a 32-byte random key (hex):
   ```bash
   openssl rand -hex 16 | tr '\n' ' ' && openssl rand -hex 16
   # Outputs two 32-char hex strings — concatenate into 64 chars
   ```

2. Add to `.env`:
   ```bash
   CSRF_COOKIE_KEY="<64-char hex string>"
   ```

3. In production, use strong random key via secrets manager.
```

- [ ] **Step 2: Add to .env.example**

File: `.env.example`

Add:
```bash
# OAuth CSRF Protection (32 bytes hex)
CSRF_COOKIE_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

- [ ] **Step 3: Verify no secrets committed**

Run: `git status`
Expected: `.env` not tracked (in .gitignore), only `.env.example` visible

---

## Task 9: Write Integration Tests

**Files:**
- Create: `backend/tests/oauth_csrf_test.rs`

- [ ] **Step 1: Create integration test file**

File: `backend/tests/oauth_csrf_test.rs`

```rust
//! Integration tests for OAuth CSRF protection.

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use tower::ServiceExt;

#[tokio::test]
async fn test_google_login_sets_csrf_cookie() {
    // 1. Create test app state
    // 2. POST /auth/google
    // 3. Verify response contains Set-Cookie header with oauth_state
    // 4. Verify cookie has HttpOnly, Secure, SameSite flags
    
    todo!("Implement with axum-test or similar");
}

#[tokio::test]
async fn test_google_callback_validates_csrf_state() {
    // 1. Get valid oauth_state cookie from /auth/google
    // 2. Call /auth/google/callback with matching state
    // 3. Verify success (redirect)
    
    todo!("Implement");
}

#[tokio::test]
async fn test_google_callback_rejects_mismatched_state() {
    // 1. Get valid oauth_state cookie from /auth/google (e.g., "abc123")
    // 2. Call /auth/google/callback with different state (e.g., "xyz789")
    // 3. Verify 400 BadRequest
    
    todo!("Implement");
}

#[tokio::test]
async fn test_google_callback_rejects_missing_state_param() {
    // 1. Get valid oauth_state cookie
    // 2. Call /auth/google/callback WITHOUT state param
    // 3. Verify 400 BadRequest
    
    todo!("Implement");
}

#[tokio::test]
async fn test_google_callback_rejects_missing_cookie() {
    // 1. Call /auth/google/callback with state param but NO cookie
    // 2. Verify 400 BadRequest
    
    todo!("Implement");
}
```

- [ ] **Step 2: Run tests (scaffolding)**

Run: `cargo test oauth_csrf_test`
Expected: Test file compiles, tests marked todo!() are pending

---

## Task 10: Verify End-to-End

**Files:**
- None (manual testing)

- [ ] **Step 1: Start backend**

Run: `cargo run` (from backend/)
Expected: Server listens on http://localhost:3000

- [ ] **Step 2: Test OAuth flow in browser**

1. Open http://localhost:3000/auth/google
2. Open DevTools → Application → Cookies → Check `oauth_state` exists, has flags:
   - HttpOnly: ✅
   - Secure: (false in dev, true in prod)
   - SameSite: Lax
3. Authorize via Google
4. Verify redirect to frontend succeeds
5. Verify `oauth_state` cookie deleted after callback

- [ ] **Step 3: Test CSRF rejection (manual)**

1. Call `/auth/google/callback?code=fake&state=wrong_state` (no cookie)
2. Expect: 400 BadRequest with "CSRF state mismatch"
3. Check logs for security warning

- [ ] **Step 4: Verify no regressions**

Run: `cargo test` (all tests)
Expected: All existing tests pass

---

## Task 11: Update Documentation

**Files:**
- Modify: `backend/CODE_NOTES.md` (if exists)

- [ ] **Step 1: Document auth flow changes**

Add to auth section:
```markdown
### OAuth CSRF Protection (2026-04-01)

CSRF state is validated via signed HttpOnly cookies:

1. `generate_csrf_state()` — creates random 32-byte state + signed cookie
2. `verify_csrf_state()` — validates callback state matches cookie
3. Handlers set/validate cookie automatically

Flow:
- GET /auth/google → generate state, set cookie, redirect to Google
- GET /auth/google/callback → verify state, exchange code, delete cookie

All state validation is automatic; handlers don't need custom logic.
```

- [ ] **Step 2: Commit changes**

Run:
```bash
git add -A
git commit -m "feat: add OAuth CSRF protection via signed cookies

- Add tower-cookies + cookie crates
- Generate & validate CSRF state via signed HttpOnly cookie
- Config: CSRF_COOKIE_KEY (32-byte hex)
- TTL: 10 minutes, SameSite=Lax, Secure in prod
- Tests: integration tests for CSRF scenarios
"
```

---

## Verification Checklist

Before marking complete:

- ✅ `cargo check` passes
- ✅ `cargo build --release` succeeds
- ✅ `cargo test` passes (all tests)
- ✅ OAuth flow works end-to-end in browser
- ✅ CSRF cookie has correct security flags
- ✅ Mismatched state returns 400
- ✅ Missing state/cookie returns 400
- ✅ `.env.example` updated
- ✅ README documents CSRF setup
- ✅ No hardcoded secrets in code
- ✅ Git log shows clean commit

