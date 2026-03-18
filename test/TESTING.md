# Testing Guide — Small Shop Admin Panel

> Covers **B1** (Collapsible Sidebar) · **B2** (Products & Categories CRUD) · **B3** (Order Management) · **B4** (Real Dashboard)

---

## 1. Prerequisites

| Tool | Required Version | Install |
|------|-----------------|---------|
| Rust | ≥ 1.75 | https://rustup.rs |
| Bun  | ≥ 1.1  | https://bun.sh |
| PostgreSQL | ≥ 14 | https://postgresql.org |
| Git  | any | — |

### 1.1 Environment Setup

Create `backend/.env` (copy from `.env.example` if present):

```env
DATABASE_URL=postgres://postgres:password@localhost:5432/small_shop
JWT_SECRET=your_super_secret_key_at_least_32_chars
ADMIN_JWT_SECRET=another_secret_key_at_least_32_chars

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8080/api/auth/google/callback
FRONTEND_URL=http://localhost:5173
```

### 1.2 Database Migrations

```bash
cd backend
# Run all SQL files in order:
psql -U postgres -d small_shop -f ../sql/001_create_users.sql
psql -U postgres -d small_shop -f ../sql/002_create_products.sql
# ... (continue for 003 through 011)
psql -U postgres -d small_shop -f ../sql/011_add_stock_to_products.sql
```

Or if you use sqlx-cli:
```bash
sqlx migrate run
```

### 1.3 Seed Admin User

```bash
# Create admin account (hashed password via argon2id):
cd backend
cargo run --bin seed_admin   # if seed binary exists
# OR manually insert:
psql -U postgres -d small_shop -c \
  "INSERT INTO admins (username, password_hash) VALUES ('admin', '\$argon2id\$...');"
```

> **Tip:** Run the backend once, then use the `/api/admin/auth/login` endpoint to create a session — or insert via the register flow if available.

---

## 2. Run the Project

### Backend

```bash
cd backend
cargo run
# Listens on http://localhost:8080
```

### Frontend

```bash
cd frontend
bun install
bun run dev
# Opens http://localhost:5173
```

---

## 3. Automated Tests

### 3.1 Backend (Rust)

```bash
cd backend
cargo test
```

Expected output:
```
running N tests
test tests::admin_auth_test::... ok
...
test result: ok. N passed; 0 failed
```

Key test file: `backend/src/tests/admin_auth_test.rs`

### 3.2 Frontend (Vitest)

```bash
cd frontend
bun run test
# or for watch mode:
bun run test --watch
```

Config: `frontend/vitest.config.ts` · Setup: `frontend/src/test/setup.ts`

---

## 4. Manual Testing Guide

### 4.0 Admin Login

1. Navigate to `http://localhost:5173/admin/login`
2. Enter credentials (username: `admin`, password: your seeded password)
3. Expect redirect to `/admin` (Dashboard)

---

### B1 — Collapsible Sidebar

**Goal:** Sidebar has tree-style navigation with collapsible groups.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open `/admin` | Sidebar visible on left (desktop) |
| 2 | Click **Quản lý Sản phẩm** group | Expands to show sub-items (Tất cả sản phẩm, Danh mục) with animation |
| 3 | Click group again | Collapses with reverse animation |
| 4 | Click **Người dùng** group | Expands (Khách hàng, Nhân viên, Phân quyền) |
| 5 | Click **Cài đặt hệ thống** group | Expands (Giao diện, Thông tin cửa hàng, Vận chuyển & Phí, Email template) |
| 6 | Navigate to `/admin/products` | Sidebar auto-opens "Quản lý Sản phẩm" group, highlights active item |
| 7 | Click **Về cửa hàng** link | Opens `/` (client storefront) |
| 8 | **Mobile:** Resize browser < 1024px | Hamburger menu appears in top bar |
| 9 | **Mobile:** Click hamburger | Overlay sidebar slides in |
| 10 | **Mobile:** Click backdrop | Overlay closes |

---

### B2 — Products CRUD

Navigate to `http://localhost:5173/admin/products`

#### Product List

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Load page | Table shows paginated list (15/page), loading skeleton shown briefly |
| 2 | Type in search box | Filters by product name in real time (on search submit / debounce) |
| 3 | Select a category filter | Table filters to that category |
| 4 | Click page numbers | Pagination works |

#### Create Product

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click **+ Thêm sản phẩm** | Modal opens with 2-column form |
| 2 | Type a Vietnamese product name | Slug field auto-generates (e.g. "Nến Thơm" → `nen-thom`) |
| 3 | Fill all fields (price, stock, category, description) | — |
| 4 | Click image upload area | File picker opens; select a JPEG/PNG |
| 5 | After upload | Image preview appears |
| 6 | Click **Tạo sản phẩm** | Modal closes; product appears in table |
| 7 | Check DB | `SELECT * FROM products ORDER BY id DESC LIMIT 1;` |

#### Edit Product

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click pencil icon on any row | Edit modal opens pre-filled with product data |
| 2 | Change the price | — |
| 3 | Click **Lưu thay đổi** | Modal closes; table row shows new price |

#### Delete Product

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click trash icon on any row | Confirm delete modal appears |
| 2 | Click **Xoá sản phẩm** | Row removed from table |

#### Image Upload (direct URL)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In create/edit modal, paste image URL in the URL field | Preview image shown |

---

### B2 — Categories CRUD

Navigate to `http://localhost:5173/admin/products/categories`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Load page | Table shows all categories |
| 2 | Click **+ Thêm danh mục** | Create modal opens |
| 3 | Type category name | Slug auto-generated from Vietnamese name |
| 4 | Optionally paste image URL | Preview shown |
| 5 | Click **Tạo danh mục** | New row appears in table |
| 6 | Click pencil icon | Edit modal pre-filled |
| 7 | Click trash (category with no products) | Deleted successfully |
| 8 | Click trash (category that has products) | Error: "Danh mục này vẫn còn sản phẩm" |

---

### B3 — Order Management

Navigate to `http://localhost:5173/admin/orders`

#### Filter & Search

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Load page | All orders shown in table |
| 2 | Click tab **Chờ xử lý** | Only `pending` orders shown |
| 3 | Type order code in search box | Filters matching orders |
| 4 | Search by customer email | Filters matching orders |
| 5 | Click page numbers | Pagination works |

#### Order Detail Modal

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click eye icon (👁) on any row | Detail modal opens |
| 2 | Check modal content | Shows order code, customer info, items list, total |

#### Status Update

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On a **pending** order row, click **✓ Xác nhận** button | Status update modal opens showing target status |
| 2 | Optionally add a note | — |
| 3 | Click **Cập nhật** | Status changes to `confirmed`; row badge updates |
| 4 | Check customer email | Customer receives "Đơn hàng đã được xác nhận" email |
| 5 | On a **confirmed** order, click **🚚 Bắt đầu giao** | Status → `shipping` |
| 6 | On a **shipping** order, click **✅ Đã giao** | Status → `delivered` |
| 7 | On a **pending** order, click **✕ Huỷ đơn** | Status → `cancelled` |

> **Email verification:** Check SMTP inbox (or use Mailtrap/Mailhog for development).

---

### B4 — Real Dashboard

Navigate to `http://localhost:5173/admin`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Load page | Loading skeleton shown for 1-2 seconds |
| 2 | After load | 4 stat cards show real DB values |
| 3 | **Doanh thu tháng này** | Matches `SELECT SUM(total_price) FROM orders WHERE status='delivered' AND ...` |
| 4 | **Tổng đơn hàng** | Matches total row count in `orders` table |
| 5 | **Khách hàng** | Matches total `users` count |
| 6 | **Sản phẩm** | Matches total `products` count |
| 7 | Recent orders table | Shows last 10 orders with real data |
| 8 | Click **Xem tất cả** | Navigates to `/admin/orders` |
| 9 | Phân loại đơn hàng | Progress bars reflect actual status distribution |
| 10 | Top sản phẩm | Shows real products sorted by units sold |
| 11 | Revenue chart | 6 bars for past 6 months, tooltips show exact VND amounts |
| 12 | Click **Làm mới** button | Data refreshes from API |
| 13 | Place a new order (client side) | After refresh, stats update |

---

## 5. API Endpoints Reference

> Base URL: `http://localhost:8080`
> Admin endpoints require: `Authorization: Bearer <admin_jwt_token>`

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/admin/auth/login` | ❌ | Admin login → returns JWT |
| `GET`  | `/api/admin/me`         | ✅ | Get current admin user |

### Dashboard
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/dashboard` | ✅ | Stats + recent orders + revenue chart + top products |

### Products
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`    | `/api/admin/products`       | ✅ | Paginated list (query: `page`, `limit`, `search`, `category_id`) |
| `POST`   | `/api/admin/products`       | ✅ | Create product |
| `GET`    | `/api/admin/products/:id`   | ✅ | Get single product |
| `PUT`    | `/api/admin/products/:id`   | ✅ | Update product |
| `DELETE` | `/api/admin/products/:id`   | ✅ | Delete product |
| `POST`   | `/api/admin/upload/image`   | ✅ | Upload image (multipart) → returns `{ url }` |

### Categories
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`    | `/api/admin/categories`     | ✅ | List all categories |
| `POST`   | `/api/admin/categories`     | ✅ | Create category |
| `PUT`    | `/api/admin/categories/:id` | ✅ | Update category |
| `DELETE` | `/api/admin/categories/:id` | ✅ | Delete category |

### Orders
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/orders`             | ✅ | Paginated orders (query: `page`, `limit`, `status`, `search`) |
| `GET` | `/api/admin/orders/:id`         | ✅ | Order detail with items |
| `PUT` | `/api/admin/orders/:id/status`  | ✅ | Update status + optional note; triggers email |

### Customers
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/customers` | ✅ | Paginated customer list |

### Static Files
| Path | Description |
|------|-------------|
| `GET /uploads/:filename` | Serve uploaded product images |

---

## 6. Example API Calls (curl)

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}' \
  | jq -r '.token')

# Dashboard stats
curl http://localhost:8080/api/admin/dashboard \
  -H "Authorization: Bearer $TOKEN" | jq .

# List products
curl "http://localhost:8080/api/admin/products?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Update order status
curl -X PUT http://localhost:8080/api/admin/orders/1/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"confirmed","note":"Đơn hàng của bạn đã được xác nhận!"}' | jq .

# Upload image
curl -X POST http://localhost:8080/api/admin/upload/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/image.jpg" | jq .
```

---

## 7. Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `cargo check` fails with `smtp_username` | Config field mismatch | Already fixed — `smtp_username` used |
| Frontend build: "Multiple exports with the same name" | Old stub not removed | Already fixed — duplicate exports removed |
| `/uploads/*` returns 404 | `uploads/` dir doesn't exist | Backend creates it on startup via `create_dir_all` |
| Dashboard shows "Không thể tải dữ liệu" | Backend not running or JWT expired | Start backend; re-login |
| Email not sent on status update | SMTP config missing | Set `SMTP_*` vars in `.env` |
| `stock` column missing | Migration 011 not run | Run `sql/011_add_stock_to_products.sql` |
