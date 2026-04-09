# OAuth CSRF Protection Design

**Date:** 2026-04-01  
**Priority:** P1 (Security Critical)  
**Scope:** Fix client-side Google OAuth flow to validate CSRF state before token exchange

---

## Goal

Prevent Cross-Site Request Forgery (CSRF) attacks on OAuth callback by validating state parameter matches a signed, HttpOnly cookie issued at login initiation.

---

## Architecture

```
Step 1: Client → GET /auth/google
├─ Server: gen random state (32 bytes hex)
├─ Server: sign state with HS256 + jwt_secret
├─ Server: SET cookie "oauth_state" (signed, HttpOnly, Secure, SameSite=Lax, TTL=10m)
└─ Server: Redirect to Google consent page with state in query param

Step 2: User authorizes → Google callback → Client → GET /auth/google/callback?code=...&state=...
├─ Client: extract state from query param
├─ Server: read & verify oauth_state cookie (signature + expiry)
├─ Server: if signature/expiry invalid → 400 BadRequest
├─ Server: if state ≠ cookie state → 400 BadRequest
├─ Server: DELETE cookie (one-time use)
├─ Server: exchange code → JWT → redirect to frontend
└─ Client: extract JWT, store, redirect to /

```

---

## Tech Stack

**New dependencies:**
- `tower-cookies` 0.10+ (Axum middleware for cookies)
- `cookie` 0.18+ (dependency of tower-cookies, for PrivateJar signing)

**Existing leveraged:**
- `jsonwebtoken` — JWT signing already configured with `jwt_secret`
- `rand` — random state generation
- `tokio` — async runtime

---

## File Structure & Responsibilities

| File | Change | Responsibility |
|------|--------|-----------------|
| `Cargo.toml` | Add `tower-cookies` | Dependency management |
| `src/config.rs` | Read `CSRF_COOKIE_KEY` | Config for signed cookies (32 bytes) |
| `src/state.rs` | Add `csrf_key: cookie::Key` | Share signing key via AppState |
| `src/services/auth_service.rs` | New fn `generate_csrf_state()` | Gen + sign state, return cookie + value |
| `src/services/auth_service.rs` | New fn `verify_csrf_state()` | Verify cookie state vs callback param |
| `src/handlers/client/user.rs` | Update `google_login()` | Set state cookie in response |
| `src/handlers/client/user.rs` | Update `google_callback()` | Validate state before token exchange |
| `src/main.rs` | Add tower-cookies middleware | Wire cookies globally |

---

## State Flow Details

### State Generation (Login Initiation)
```rust
pub fn generate_csrf_state(key: &cookie::Key) -> (String, Cookie<'static>) {
    let state = gen_random_state();  // 32 bytes hex string
    
    let mut cookie = Cookie::new("oauth_state", state.clone());
    cookie.set_http_only(true);
    cookie.set_secure(true);
    cookie.set_same_site(SameSite::Lax);
    cookie.set_max_age(Duration::minutes(10));
    cookie.set_path("/");
    
    // Sign with key
    let signed_cookie = PrivateJar::new(key).add(cookie);
    
    (state, signed_cookie)
}
```

### State Verification (Callback)
```rust
pub fn verify_csrf_state(
    cookies: &Cookies,
    key: &cookie::Key,
    callback_state: &str,
) -> Result<(), CsrfError> {
    let jar = PrivateJar::new(key);
    
    let cookie = cookies
        .get("oauth_state")
        .ok_or(CsrfError::MissingCookie)?;
    
    let decrypted = jar.decrypt(cookie)
        .ok_or(CsrfError::InvalidSignature)?;
    
    let stored_state = decrypted.value();
    
    if stored_state != callback_state {
        return Err(CsrfError::StateMismatch);
    }
    
    Ok(())
}
```

---

## Configuration

**New env var:**
```bash
CSRF_COOKIE_KEY="<32-byte random hex string>"
```

Generate via:
```bash
openssl rand -hex 16  # outputs 32 hex chars = 16 bytes
# repeat to get 32 bytes total (64 hex chars)
```

Or in Rust at startup:
```rust
let key = cookie::Key::generate();
```

For local dev: store in `.env`, generate once per machine.

---

## Error Handling

**New error types:**
```rust
pub enum CsrfError {
    MissingCookie,
    InvalidSignature,
    StateMismatch,
    Expired,
}

// Maps to HTTP 400 BadRequest with descriptive message
```

---

## Testing Strategy

1. **Unit tests** (auth_service.rs):
   - ✅ State generation creates valid signed value
   - ✅ State verification accepts matching states
   - ✅ State verification rejects mismatched states
   - ✅ Expired cookies rejected

2. **Integration tests** (routes):
   - ✅ GET /auth/google sets oauth_state cookie
   - ✅ GET /auth/google/callback rejects missing state param
   - ✅ GET /auth/google/callback rejects mismatched state
   - ✅ GET /auth/google/callback succeeds with valid state
   - ✅ Cookie deleted after successful validation

3. **Security tests**:
   - ✅ HttpOnly flag set (cannot access via JS)
   - ✅ Secure flag set (HTTPS only in prod)
   - ✅ SameSite=Lax enforced

---

## Backwards Compatibility

**No breaking changes** — client OAuth flow appears same externally:
- Redirect URL unchanged
- Callback URL unchanged
- Response body unchanged

Only internal validation stricter.

---

## Success Criteria

- ✅ CSRF attack attempt returns 400 (not 200)
- ✅ Valid OAuth flow works end-to-end
- ✅ Unit + integration tests pass
- ✅ No additional external dependencies except tower-cookies
- ✅ Config documented in README/.env.example

---

## Rollout Notes

1. Add `CSRF_COOKIE_KEY` to `.env` + CI/CD secrets
2. Deploy backend
3. Test OAuth flow manually (QA)
4. Monitor error logs for CSRF rejections (should be none unless attack)
