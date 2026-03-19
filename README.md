<div align="center">https://github.com/thienty1207/small-shop</div>
<div align="center">Small Shop is a full-stack perfume e-commerce platform with a client storefront and an admin panel for product, order, coupon, review, and report management.</div>

<div align="center">

[![last commit](https://img.shields.io/github/last-commit/thienty1207/small-shop?style=flat&label=last%20commit)](https://github.com/thienty1207/small-shop/commits/main)
[![languages](https://img.shields.io/github/languages/count/thienty1207/small-shop?style=flat&label=languages)](https://github.com/thienty1207/small-shop)

</div>

<div align="center">Built with modern technologies:</div>

<div align="center">

[![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Axum](https://img.shields.io/badge/Axum-0A0A0A?style=for-the-badge&logo=rust&logoColor=white)](https://github.com/tokio-rs/axum)
[![SQLx](https://img.shields.io/badge/SQLx-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://github.com/launchbadge/sqlx)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

</div>

<div align="center">

[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

</div>

<div align="center">

[![TanStack Query](https://img.shields.io/badge/TanStack_Query-FF4154?style=for-the-badge&logo=react-query&logoColor=white)](https://tanstack.com/query)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-111111?style=for-the-badge&logo=radix-ui&logoColor=white)](https://ui.shadcn.com/)
[![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh/)

</div>

---

## Features

- Client storefront: products, variants, cart, checkout, wishlist, reviews, account, order history.
- Admin panel: dashboard analytics, products/categories CRUD, order workflow, coupons, review moderation.
- System: role-based admin access, SSE notifications, CSV/Excel exports for orders/products.

## Project Structure

- `backend/` — Rust + Axum API
- `frontend/` — React + Vite app
- `sql/` — migration scripts
- `test/` — backend/frontend test suites

## Quick Start

1. Install Rust, Bun, PostgreSQL.
2. Configure `.env` for backend/frontend.
3. Restore the local database dump:
   - Linux/macOS: `bash scripts/restore-small-shop.sh`
   - Windows PowerShell: `powershell -ExecutionPolicy Bypass -File .\scripts\restore-small-shop.ps1`
4. Start backend:
   - `cd backend`
   - `cargo run`
5. Start frontend:
   - `cd frontend`
   - `bun dev`

Notes:

- The restore scripts import `small-shop.dump` into the database from `DATABASE_URL`.
- They also sync the local `_sqlx_migrations` checksums with the current `sql/*.sql` files so the backend can start cleanly after a restore on a different machine/OS.
- The backend already runs migrations automatically on startup, so `cargo sqlx migrate run` is not required for normal local setup.

## Build & Test

- Backend: `cargo check` / `cargo test`
- Frontend: `bun run build` / `bun test`
