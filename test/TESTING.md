# Testing Guide - small-shop

This file documents the test setup that the repo actually runs today.

## 1. Source Of Truth

- Backend test runner: `cd backend && cargo test`
- Frontend test runner: `cd frontend && bun test`
- Frontend test discovery: `frontend/vitest.config.ts`
- Backend test modules: `backend/src/tests/`

If this document conflicts with those files, trust the codebase and update this file.

## 2. Runtime Defaults

- Backend default port in code: `3000`
- Frontend Vite dev server port: `8080`
- Backend auto-runs migrations from `../sql` on startup

## 3. Automated Tests

### Backend

Primary command:

```bash
cd backend && cargo test
```

Current auto-run backend test locations:

- `backend/src/tests/`
- any co-located Rust tests behind `#[cfg(test)]`

Important note:

- `test/backend/` exists, but not every file there is wired into Cargo automatically
- For example, `test/backend/user_profile_test.rs` is supplemental test material, not a normal Cargo integration target in the current workspace layout

### Frontend

Primary command:

```bash
cd frontend && bun test
```

Vitest currently discovers tests from:

- `frontend/src/**/*.{test,spec}.{ts,tsx}`
- `test/frontend/**/*.{test,spec}.{ts,tsx}`

Shared setup file:

- `frontend/src/test/setup.ts`

## 4. Fast Verification Commands

Backend compile check:

```bash
cd backend && cargo check
```

Frontend production build:

```bash
cd frontend && bun run build
```

## 5. Database And Local Setup

The simplest local workflow is:

1. Restore a dump if needed
2. Start the backend
3. Start the frontend
4. Run the relevant automated tests

Restore helpers:

Windows PowerShell:

```bash
powershell -ExecutionPolicy Bypass -File .\scripts\restore-small-shop.ps1
```

Linux or macOS:

```bash
bash scripts/restore-small-shop.sh
```

Start services:

```bash
cd backend && cargo run
```

```bash
cd frontend && bun dev
```

## 6. Manual Smoke Checks

Use these when a change affects live flows and automated coverage is partial.

### Admin

- Login at `/admin/login`
- Open dashboard at `/admin`
- Open products, orders, customers, reviews, coupons, and settings pages
- Confirm protected admin routes still redirect correctly when unauthenticated

### Client

- Open homepage, products list, product detail, cart, checkout, account, and wishlist
- Confirm auth-required routes still redirect correctly when unauthenticated

### Backend Integrations

- Confirm `/uploads/*` static serving still works if the change touches uploads
- Confirm email-related flows only if SMTP is configured locally
- Confirm Cloudinary-related flows only if `CLOUDINARY_URL` is configured locally

## 7. Practical Rules

- Run the smallest command that proves your claim
- Do not claim a test passed unless you ran it
- Do not assume every file under `test/backend/` is active in Cargo
- If a test harness is missing for a path, say what you verified manually

## 8. Key Files

- `backend/src/tests/admin_auth_test.rs`
- `frontend/src/test/AdminLogin.test.tsx`
- `frontend/src/test/admin/dashboard.test.ts`
- `test/frontend/*.test.*`
