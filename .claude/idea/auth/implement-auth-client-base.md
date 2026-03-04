# Plan: Google OAuth Authentication (Full-Stack)

## Overview

Remove manual email/password registration. Replace with **Google OAuth login only**.
Backend (Rust/Axum) handles the full OAuth flow, stores user in PostgreSQL, issues JWT.
Frontend (React) manages session via `AuthContext` and calls backend API.

---

## Steps

### Step 1 — Database Migration
- File: `sql/001_create_users.sql`
- Create `users` table:
  - `id` UUID PRIMARY KEY (default gen_random_uuid())
  - `google_id` VARCHAR UNIQUE NOT NULL
  - `email` VARCHAR UNIQUE NOT NULL
  - `name` VARCHAR NOT NULL
  - `avatar_url` VARCHAR
  - `role` VARCHAR NOT NULL DEFAULT 'customer'
  - `refresh_token` VARCHAR (reserved for future use)
  - `token_expires_at` TIMESTAMPTZ (reserved for future use)
  - `last_login_at` TIMESTAMPTZ
  - `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
  - `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- Add indexes on `google_id` and `email`

---

### Step 2 — Environment Configuration
- File: `backend/.env.example`
- Variables:
  ```
  DATABASE_URL=postgres://user:password@localhost:5432/smallshop
  GOOGLE_CLIENT_ID=
  GOOGLE_CLIENT_SECRET=
  GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
  JWT_SECRET=
  JWT_EXPIRATION_HOURS=24
  FRONTEND_URL=http://localhost:5173
  SERVER_PORT=3000
  ```
- Copy to `backend/.env` and fill in real values before running

> **Prerequisites:** Create OAuth 2.0 credentials in Google Cloud Console.
> Set Authorized Redirect URI = `http://localhost:3000/auth/google/callback`

---

### Step 3 — Backend Bootstrap
- `backend/src/main.rs` — init tracing, load config, create PgPool, build Router, axum::serve
- `backend/src/config.rs` — load all env vars into a `Config` struct using `dotenvy`
- `backend/src/state.rs` — `AppState { db: PgPool, config: Arc<Config> }`
- `backend/src/error.rs` — `AppError` enum (Unauthorized, NotFound, Database, Internal), impl `IntoResponse`
- `backend/src/lib.rs` — re-export main modules for integration tests

---

### Step 4 — Backend Auth Feature

#### Models — `backend/src/models/user.rs`
```
User                  — DB row struct (matches users table)
GoogleUserInfo        — response from Google's userinfo API
Claims                — JWT payload (sub, email, name, role, exp)
AuthResponse          — returned to frontend { token, user }
```

#### Repository — `backend/src/repositories/user_repo.rs`
```
find_by_google_id(pool, google_id) -> Option<User>
find_by_email(pool, email)         -> Option<User>
insert_user(pool, data)            -> User
update_last_login(pool, id)        -> ()
```

#### Service — `backend/src/services/auth_service.rs`
```
build_google_auth_url(config)           -> (url, csrf_state)
exchange_code_for_token(config, code)   -> GoogleTokens
fetch_google_user_info(access_token)    -> GoogleUserInfo
upsert_user(pool, google_info)          -> User  (find or create)
generate_jwt(config, user)              -> String
verify_jwt(config, token)               -> Claims
```

#### Handlers — `backend/src/handlers/user.rs`
```
GET /auth/google           -> google_login()    — redirect to Google consent page
GET /auth/google/callback  -> google_callback() — exchange code, upsert user, issue JWT,
                                                   redirect to FRONTEND_URL/auth/callback?token=...
GET /api/me                -> get_me()          — protected, return current user from JWT
```

#### Routes — `backend/src/routes/user.rs`
```
Router::new()
  .route("/auth/google",          get(google_login))
  .route("/auth/google/callback", get(google_callback))
  .route("/api/me",               get(get_me))
```

#### Middleware — `backend/src/middleware/auth.rs`
```
jwt_auth middleware — extract Bearer token from Authorization header,
                      verify JWT, inject CurrentUser into request extensions
```

---

### Step 5 — Frontend Changes

#### New: `frontend/src/contexts/AuthContext.tsx`
- State: `user` (name, email, avatar) | `null`, `isAuthenticated`, `isLoading`
- On mount: read `token` from `localStorage`, call `GET /api/me` to validate
- `login(token)` — store token, fetch user, set state
- `logout()` — clear token, reset state
- Export `useAuth` hook

#### Update: `frontend/src/pages/Login.tsx`
- Remove email/password form and links to `/register`, `/forgot-password`
- Add single "Sign in with Google" button → `window.location.href = VITE_API_URL + "/auth/google"`

#### New: `frontend/src/pages/AuthCallback.tsx`
- Reads `?token=` from URL query params
- Calls `login(token)` from AuthContext
- Redirects to `/`

#### Update: `frontend/src/components/layout/Header.tsx`
- If `isAuthenticated` → show avatar + name linking to `/account`
- If not → show User icon linking to `/login`

#### Update: `frontend/src/App.tsx`
- Remove routes `/register`, `/forgot-password`
- Add `<AuthProvider>` wrapping `<BrowserRouter>`
- Add `/auth/callback` route → `<AuthCallback />`
- Add `<ProtectedRoute>` wrapper for `/account`, `/checkout`, `/account/orders/:id`

#### Delete
- `frontend/src/pages/Register.tsx`
- `frontend/src/pages/ForgotPassword.tsx`

---

### Step 6 — Testing Plan

#### Backend
| Test | Type | What to verify |
|------|------|----------------|
| `user_repo` CRUD | Integration (`sqlx::test`) | insert, find_by_google_id, find_by_email, update_last_login |
| `auth_service::upsert_user` | Unit + mock | new user → insert; existing → return existing, no duplicate |
| `auth_service::generate_jwt` | Unit | correct claims, decodable with same secret |
| `auth_service::verify_jwt` | Unit | valid → ok; expired → 401; tampered → 401 |
| `GET /api/me` | Handler integration | valid JWT → 200 + user; no/bad token → 401 |
| `GET /auth/google` | Handler integration | 302 redirect to accounts.google.com |
| `jwt_auth middleware` | Unit | valid → inject CurrentUser; invalid → 401 |

#### Frontend
| Test | Type | What to verify |
|------|------|----------------|
| `AuthContext` | Vitest | login sets state + localStorage; logout clears both |
| `Login.tsx` | Testing Library | Google button present; no register/forgot links |
| `Header.tsx` | Testing Library | unauthenticated → /login icon; authenticated → avatar shown |
| `ProtectedRoute` | Testing Library | unauthenticated → redirect to /login |
| `AuthCallback.tsx` | Testing Library | reads token from URL, calls login(), redirects to / |

#### E2E (Manual — Phase 1)
1. `/login` → Google button visible
2. Click → redirected to Google
3. Authenticate → redirected back to `/auth/callback?token=...`
4. Header shows avatar + name
5. `/account` → accessible
6. Logout → User icon returns, `/account` redirects to `/login`

---

## Security Notes

| Risk | Mitigation now | Future hardening |
|------|---------------|------------------|
| CSRF on OAuth callback | Validate `state` param before exchanging code | — |
| JWT in localStorage (XSS) | Sanitize all rendered user content | Migrate to `httpOnly` cookie |
| JWT expiry | `exp` claim (24h), 401 on expiry | Refresh token flow |
| Token replay after logout | — | Short-lived JWT + Redis blacklist |
| Google API errors | Proper error handling + propagation | Retry with backoff |
| Role escalation | Validate `role` server-side on every protected endpoint | RBAC middleware |
| Rate limiting | — | `tower_governor` on `/auth/*` routes |

---

## File Checklist

```
[ ] sql/001_create_users.sql
[ ] backend/.env.example
[ ] backend/src/main.rs
[ ] backend/src/lib.rs
[ ] backend/src/config.rs
[ ] backend/src/state.rs
[ ] backend/src/error.rs
[ ] backend/src/models/user.rs
[ ] backend/src/repositories/user_repo.rs
[ ] backend/src/services/auth_service.rs
[ ] backend/src/handlers/user.rs
[ ] backend/src/routes/user.rs
[ ] backend/src/middleware/auth.rs
[ ] frontend/src/contexts/AuthContext.tsx
[ ] frontend/src/pages/AuthCallback.tsx
[ ] frontend/src/pages/Login.tsx              (update)
[ ] frontend/src/components/layout/Header.tsx (update)
[ ] frontend/src/App.tsx                      (update)
[ ] frontend/src/pages/Register.tsx           (delete)
[ ] frontend/src/pages/ForgotPassword.tsx     (delete)
```
