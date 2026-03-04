# Small Shop — Implementation Log

> Full-stack e-commerce application built with **Rust/Axum** (backend) and **React/TypeScript** (frontend).

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Rust · Axum 0.7 · SQLx 0.7 · PostgreSQL |
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS v4 · shadcn/ui |
| Auth | JWT (jsonwebtoken) — `Authorization: Bearer <token>` |
| Email | Lettre + SMTP (Gmail) — built once at startup, stored in AppState |
| Package manager (FE) | Bun |

---

## Database Migrations

| File | Description |
|---|---|
| `001_users.sql` | Users table — id, email, password_hash, name, phone, role, created_at |
| `002_sessions.sql` | (reserved) |
| `003_contacts.sql` | Contact form submissions |
| `004_categories.sql` | Product categories — id, name, slug, image |
| `005_products.sql` | Products — id, category_id, name, slug, price, images (array), stock, etc. |
| `006_cart_items.sql` | Shopping cart — user_id + product_id + variant + quantity (UNIQUE constraint) |
| `007_orders.sql` | Orders — order_code, customer info, payment_method, status, totals |
| `008_order_items.sql` | Order line items — order_id, product snapshot (name/image/price/variant) |

---

## Backend Architecture

### Entry point — `main.rs`
- Loads `.env` config
- Connects to PostgreSQL pool (5 connections)
- Builds SMTP mailer **once** at startup — stored as `Option<AsyncSmtpTransport<Tokio1Executor>>` in `AppState`
- Mounts all routes under `/api`

### AppState (`state.rs`)
```rust
pub struct AppState {
    pub db: PgPool,
    pub config: Arc<Config>,
    pub mailer: Option<AsyncSmtpTransport<Tokio1Executor>>,
}
```

### Layers (per feature)

#### Auth — `auth`
- `POST /api/auth/register` — bcrypt hash, insert user, return JWT
- `POST /api/auth/login` — verify password, return JWT
- `GET /api/auth/me` — JWT middleware → `Extension<UserPublic>`
- Middleware: `auth_middleware` extracts Bearer token, validates JWT, injects `UserPublic`

#### Products — `products`
- `GET /api/products` — list all with optional `?category=slug&search=term`
- `GET /api/products/:slug` — single product by slug

#### Categories — `categories`
- `GET /api/categories` — list all (id, name, slug, image, product_count)

#### Cart — `cart`
- `GET /api/cart` — get user's cart items (requires auth)
- `POST /api/cart` — upsert item (insert or update quantity)
- `DELETE /api/cart/:product_id` — remove item
- `DELETE /api/cart` — clear entire cart

#### Orders — `orders`
- `POST /api/orders` — create order from cart (auth required)
  - Validates items, calculates totals, generates `order_code` (ORD-YYYYMMDD-XXXX)
  - Single transaction: inserts order + all items with `RETURNING` → no extra DB roundtrip
  - Clears user cart after successful insert
  - Sends confirmation email via `tokio::spawn` (fire-and-forget, doesn't block response)
- `GET /api/orders` — list user's orders (with item count per order via LEFT JOIN)
- `GET /api/orders/:id` — get full order detail with line items (auth + ownership check)

#### Contact — `contacts`
- `POST /api/contacts` — save form submission + send admin notification + auto-reply

### Email Service (`services/email_service.rs`)
- `build_mailer(config)` — called once at startup
- `send_admin_notification(config, mailer, contact)` — new contact form submission
- `send_auto_reply(config, mailer, contact)` — auto-reply to customer
- `send_order_confirmation(config, mailer, order, items)` — order receipt email

### Performance Optimisations
- **SMTP mailer pre-built**: eliminates per-request TCP + TLS handshake (~300 ms saved per email)
- **RETURNING on inserts**: `create_order` returns `(Order, Vec<OrderItem>)` without extra SELECT roundtrip
- **Fire-and-forget email**: `tokio::spawn` sends confirmation email after response is returned to client
- **Pool size**: 5 connections (configurable)

---

## Frontend Architecture

### Pages

| Route | File | Description |
|---|---|---|
| `/` | `Index.tsx` | Home — hero, featured products, categories, reviews |
| `/products` | `Products.tsx` | Filtered product grid |
| `/products/:slug` | `ProductDetail.tsx` | Product detail + add to cart |
| `/cart` | `Cart.tsx` | Cart summary + quantity controls |
| `/checkout` | `Checkout.tsx` | Order form (auth required) |
| `/order-success` | `OrderSuccess.tsx` | Post-order confirmation |
| `/account` | `Account.tsx` | Profile + orders list |
| `/account/orders/:id` | `OrderDetail.tsx` | Order detail view |
| `/login` | `Login.tsx` | Login with redirect-after-login support |
| `/register` | `Register.tsx` | Registration |
| `/forgot-password` | `ForgotPassword.tsx` | Password reset flow |
| `/about` | `About.tsx` | About page |
| `/contact` | `Contact.tsx` | Contact form with Cloudflare Turnstile |
| `/policy` | `Policy.tsx` | Terms & policies |

### State Management

- **AuthContext** (`contexts/AuthContext.tsx`) — JWT stored in `localStorage` as `auth_token`, provides `user`, `isAuthenticated`, `login()`, `logout()`
- **CartContext** (`contexts/CartContext.tsx`) — synced with backend cart API; `useAuth()` used to detect login/logout and reload cart
- Provider nesting in `App.tsx`: `AuthProvider` → `BrowserRouter` → `CartProvider`

### API Hooks (`hooks/`)

| Hook | Endpoint | Description |
|---|---|---|
| `useProducts` | `GET /api/products` | Paginated/filtered product list |
| `useCategories` | `GET /api/categories` | All categories |

### Cart Flow
1. User adds item → `POST /api/cart` (upsert)
2. CartContext reloads on auth state change
3. Checkout page posts `POST /api/orders` with cart items
4. On success → navigate to `/order-success?code=ORD-...`
5. Cart cleared (backend + context)

### Account Orders
- Fetches `GET /api/orders` on tab switch (lazy load)
- Shows order_code, date, item count, status badge (Vietnamese label), total
- Status → Vietnamese: `pending` → Đang xử lý, `confirmed` → Đã xác nhận, `shipping` → Đang giao, `delivered` → Đã giao, `cancelled` → Đã huỷ

### Header
- Shows cart item count (from CartContext)
- On "Login" click: saves current path as `?redirect=` param
- After login: redirects back to original page

---

## Bug Fixes Applied

| Issue | Root Cause | Fix |
|---|---|---|
| NaN prices in cart | `BackendCartItem.product_price` field mismatch | Renamed to `price` in CartContext |
| Garbled Vietnamese category names | psql session encoding mismatch | `sql/fix_category_names.sql` with `\encoding UTF8` |
| 8–10s order latency | Per-request SMTP TCP+TLS handshake | Pre-built mailer in AppState |
| Footer floating mid-page on Account | Content div missing `flex-1`, outer missing `flex flex-col` | Added flex layout to Account.tsx root div |

---

## Testing

- **Frontend:** Vitest + React Testing Library
- `Cart.test.tsx` — 6 tests (render, quantity controls, total calculation, empty state)
- `Checkout.test.tsx` — 5 tests (form validation, auth redirect, order submission)
- All 19 tests pass (`bun run test`)

---

## Environment Variables

```env
DATABASE_URL=postgres://postgres:<password>@localhost:5432/smallshop
JWT_SECRET=<secret>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<gmail>
SMTP_PASS=<app-password>
ADMIN_EMAIL=<recipient>
VITE_API_URL=http://localhost:3000
VITE_TURNSTILE_SITE_KEY=<cloudflare-key>
```
