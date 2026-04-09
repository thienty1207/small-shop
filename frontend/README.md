# Small Shop — Perfume E-commerce Platform

Small Shop is a full-stack perfume e-commerce system with a client storefront and an admin control panel.

It supports product catalog management, variants, cart/checkout flow, wishlist, reviews, coupons, order lifecycle, dashboard analytics, real-time admin notifications, and CSV/Excel report exports.

## Tech Stack

### Backend
- Rust (Edition 2024)
- Axum
- SQLx (PostgreSQL)
- Tokio
- Argon2 (password hashing)
- JWT authentication
- Lettre (email notifications)

### Frontend
- React 18 + TypeScript
- Vite
- React Router 6
- TanStack Query
- Tailwind CSS
- shadcn/ui (Radix)
- Sonner (toast)

### Database
- PostgreSQL

### Tooling
- Cargo (backend)
- Bun (frontend)
- Vitest + Testing Library (frontend tests)

## Main Features

- Client storefront:
	- Product listing, search, sort, pagination
	- Product detail with variants
	- Cart and checkout
	- Wishlist
	- Product reviews
	- Account and order history

- Admin panel:
	- Dashboard metrics (revenue, order status, top products)
	- Product CRUD + category CRUD
	- Variant and stock management
	- Order management and status updates
	- Coupon management
	- Review moderation
	- Staff and role-based access control
	- Shop settings (appearance, store info, shipping, email template)
	- CSV/Excel export for orders and products
	- Real-time notifications (SSE)

## Project Structure

```text
backend/     # Axum + SQLx backend
frontend/    # React + Vite frontend
sql/         # PostgreSQL migration scripts
test/        # Frontend/backend test suites
```

## Getting Started

### 1) Prerequisites
- Rust toolchain
- Bun
- PostgreSQL

### 2) Configure environment
- Create `.env` files for backend/frontend with your local settings (database URL, JWT secrets, API base URL, etc.).

### 3) Run migrations
```bash
cd backend
cargo sqlx migrate run --source ../sql
```

### 4) Start backend
```bash
cd backend
cargo run
```

### 5) Start frontend
```bash
cd frontend
bun dev
```

## Build

```bash
# Backend
cd backend
cargo check

# Frontend
cd frontend
bun run build
```

## Testing

```bash
# Frontend
cd frontend
bun test

# Backend
cd backend
cargo test
```

## Notes

- This repository currently focuses on the Small Shop perfume domain and production-like admin operations.
- Report exports are available in the admin Orders and Products pages.