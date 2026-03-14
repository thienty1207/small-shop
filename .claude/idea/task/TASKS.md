# Small Shop — Task List

> Cập nhật lần cuối: 2026-03-10 (B1–B8 ✅ + B10 ✅ + B11 ✅ + B12 ✅ + B13 ✅ + B15 ✅ + B16 ✅)
> Mỗi task hoàn thành sẽ được đánh dấu `[x]`

---

## 🔴 CORE BUSINESS — Phải có

### B1: Admin Sidebar + Skeleton Pages ✅
- [x] Rebuild `AdminLayout.tsx` với collapsible sub-menu
- [x] Sidebar structure:
  ```
  Dashboard
  Quản lý Sản phẩm ›
    ├── Tất cả sản phẩm (CRUD inline)
    └── Danh mục
  Quản lý Đơn hàng (1 trang, filter tabs)
  Quản lý Người dùng ›
    ├── Khách hàng
    ├── Nhân viên
    └── Phân quyền
  Cài đặt hệ thống ›
    ├── Giao diện (Hero, Banner, Font)
    ├── Thông tin cửa hàng
    ├── Vận chuyển & Phí
    └── Email template
  ────
  Về cửa hàng
  ```
- [x] Tạo skeleton pages cho tất cả routes mới
- [x] Wire routes trong `App.tsx`
- [x] Test navigation hoạt động đúng
- [x] `cargo check` + `bun run build` pass
- [x] Git push

---

### B2: Admin CRUD Sản phẩm + Upload ảnh ✅
- [x] Backend API: `GET /api/admin/products` (list, search, filter, phân trang)
- [x] Backend API: `POST /api/admin/products` (tạo mới)
- [x] Backend API: `PUT /api/admin/products/:id` (cập nhật)
- [x] Backend API: `DELETE /api/admin/products/:id` (xoá / soft-delete)
- [x] Backend API: Upload ảnh sản phẩm (lưu local → `/uploads/`, served qua ServeDir)
- [x] Backend API: CRUD danh mục (`/api/admin/categories`)
- [x] Frontend: Trang "Tất cả sản phẩm" — bảng data, search, filter theo danh mục
- [x] Frontend: Modal/drawer thêm sản phẩm (tên, giá, mô tả, danh mục, ảnh, stock)
- [x] Frontend: Inline edit / modal sửa sản phẩm
- [x] Frontend: Xác nhận xoá sản phẩm
- [x] Frontend: Trang "Danh mục" — CRUD inline
- [x] Frontend: Upload ảnh với preview trước khi submit
- [x] Test backend + frontend
- [x] Git push

---

### B3: Admin Quản lý Đơn hàng + Email thông báo ✅
- [x] Backend API: `GET /api/admin/orders` (list, filter theo status, search theo mã đơn/tên khách)
- [x] Backend API: `PUT /api/admin/orders/:id/status` (đổi trạng thái + ghi chú)
- [x] Backend API: `GET /api/admin/orders/:id` (chi tiết đơn hàng)
- [x] Backend: Gửi email tự động cho khách khi đổi trạng thái
- [x] Frontend: Trang "Quản lý Đơn hàng" — bảng data với filter tabs:
  - Tất cả | Chờ xử lý | Đã xác nhận | Đang giao | Đã giao | Đã huỷ
- [x] Frontend: Quick action button theo context:
  - pending → "✓ Xác nhận"
  - confirmed → "🚚 Giao hàng"
  - shipping → "✅ Đã giao"
  - any → "✗ Huỷ đơn"
- [x] Frontend: Modal xác nhận đổi trạng thái + ô ghi chú
- [x] Frontend: Modal chi tiết đơn hàng (sản phẩm, thông tin khách hàng)
- [x] Test backend + frontend
- [x] Git push

---

### B4: Admin Dashboard thật (từ DB) ✅
- [x] Backend API: `GET /api/admin/dashboard` — trả về tất cả trong 1 endpoint:
  - Tổng doanh thu (hôm nay / tháng này)
  - Tổng đơn hàng (theo từng trạng thái)
  - Tổng khách hàng + mới tháng này
  - Tổng sản phẩm + sản phẩm sắp hết hàng
- [x] Backend API: 10 đơn gần nhất (trong response dashboard)
- [x] Backend API: Doanh thu 6 tháng gần nhất (revenue_chart)
- [x] Backend API: Top 5 sản phẩm bán chạy (top_products)
- [x] Frontend: Thay toàn bộ mock data bằng API thật
- [x] Frontend: Chart doanh thu (CSS bars, dynamic height, tooltip VND)
- [x] Test backend
- [x] Git push

---

### B5: Tìm kiếm + Lọc + Sắp xếp + Phân trang (Client) ✅
- [x] Backend API: `GET /api/products?search=&category=&sort=&page=&limit=`
- [x] Backend: Full-text search tiếng Việt (unaccent + tsvector hoặc ILIKE)
- [x] Backend: Sort options: `price_asc`, `price_desc`, `newest`, `best_selling`
- [x] Backend: Phân trang (offset-based) + trả `total_count` cho pagination UI
- [x] Frontend: Thanh search trên Header hoạt động thật (debounce 300ms)
- [x] Frontend: Trang Products — filter sidebar theo danh mục
- [x] Frontend: Trang Products — dropdown sắp xếp
- [x] Frontend: Trang Products — pagination component
- [x] Test backend + frontend
- [x] Git push

---

### B6: Tồn kho (Stock Management) ✅
- [x] Backend: Thêm cột `stock` vào bảng `products` (migration `011_add_stock_to_products.sql`)
- [x] Backend: Trừ stock khi đặt hàng thành công (transaction)
- [x] Backend: Hoàn stock khi huỷ đơn
- [x] Backend: Check stock trước khi checkout → trả lỗi nếu không đủ
- [x] Frontend (client): Hiện "Hết hàng" khi stock = 0, disable nút "Thêm vào giỏ"
- [x] Frontend (client): Hiện "Còn X sản phẩm" khi stock thấp (< 5)
- [x] Frontend (admin): Hiện cột stock trong bảng sản phẩm
- [x] Frontend (admin): Cảnh báo sản phẩm sắp hết hàng trên Dashboard
- [x] Test backend
- [x] Git push

---

### B7: Role System (Phân quyền nhân viên) ✅
- [x] Database: Bảng `staff` (id, username, password_hash, full_name, role, is_active)
- [x] Database: Bảng `permissions` hoặc role-based config
- [x] Backend: Mở rộng `admin_guard` — kiểm tra role + permission cho từng route
- [x] Backend: API CRUD staff (`/api/admin/staff`)
- [x] Backend: API gán role cho staff
- [x] Roles:
  | Role | Quyền |
  |---|---|
  | `super_admin` | Toàn quyền |
  | `manager` | Sản phẩm + Đơn hàng + Xem khách hàng. Không vào Cài đặt, Phân quyền |
  | `staff` | Chỉ xem + xử lý đơn hàng |
- [x] Frontend: Trang "Nhân viên" — CRUD + gán role
- [x] Frontend: Trang "Phân quyền" — matrix role × permission
- [x] Frontend: Ẩn/disable menu + button theo quyền hiện tại (`filterNav` trong AdminLayout + `SuperAdminRoute`/`ManagerRoute` guards trong App.tsx)
- [x] Test backend + frontend
- [x] Git push

---

### B8: Cài đặt hệ thống ✅
- [x] Database: Bảng `shop_settings` (key-value store)
- [x] Backend API: `GET /api/admin/settings` — lấy toàn bộ settings
- [x] Backend API: `PUT /api/admin/settings` — cập nhật settings
- [x] Backend API: Upload ảnh hero/banner (dùng chung endpoint `/api/admin/upload` từ B2)
- [x] Frontend — Trang "Giao diện":
  - [x] Quản lý Hero slides (3 slides, upload ảnh, chỉnh title/subtitle/CTA/href)
  - [x] Quản lý Banner khuyến mãi (ảnh + link)
  - [x] Chọn font chữ (Google Fonts picker với preview live)
  - [x] Preview trước khi lưu
- [x] Frontend — Trang "Thông tin cửa hàng":
  - [x] Tên shop, logo, địa chỉ, SĐT, email
  - [x] Social links (Facebook, Instagram, TikTok)
- [x] Frontend — Trang "Vận chuyển & Phí":
  - [x] Phí ship mặc định
  - [x] Miễn phí ship từ X đồng
- [x] Frontend — Trang "Email template":
  - [x] Xem trước email xác nhận đơn / đổi trạng thái
  - [x] Sửa nội dung template (text, logo)
- [x] Client-side: Đọc settings từ API thay vì hardcode (`ShopSettingsContext` dùng trong Index, Contact, Footer, Header)
- [x] Test backend
- [x] Git push

---

## 🟡 NÊN CÓ — UX tốt hơn

### B9: Wishlist / Yêu thích
- [x] Database: Bảng `wishlists` (user_id, product_id)
- [x] Backend API: `POST /api/wishlist/:product_id` (toggle yêu thích)
- [x] Backend API: `GET /api/wishlist` (danh sách yêu thích)
- [x] Frontend: Nút trái tim trên card sản phẩm + trang chi tiết
- [x] Frontend: Trang "Yêu thích" trong account
- [ ] Git push

---

### B10: Đánh giá sản phẩm ✅
- [x] Database: Bảng `reviews` (user_id, product_id, rating 1-5, comment, created_at)
- [x] Backend: Chỉ cho phép review nếu đã mua + đơn đã giao
- [x] Backend API: `POST /api/products/:id/reviews`
- [x] Backend API: `GET /api/products/:id/reviews` (phân trang)
- [x] Frontend (client): Form review trên trang chi tiết sản phẩm
- [x] Frontend (client): Hiện rating trung bình + số lượng review trên card
- [x] Frontend (admin): Quản lý review (xoá review spam)
- [x] Git push

---

### B11: Mã giảm giá / Voucher ✅
- [x] Database: Bảng `coupons` (code, type, value, min_order, max_uses, expires_at)
- [x] Backend: Validate coupon khi checkout
- [x] Backend API: CRUD coupon cho admin
- [x] Frontend (client): Ô nhập mã giảm giá ở trang Checkout
- [x] Frontend (admin): Trang quản lý mã giảm giá
- [x] Git push

---

### B12: Thông báo realtime (Admin) ✅
- [x] Backend: SSE endpoint (`/api/admin/notifications/stream`)
- [x] Backend: Gửi notification khi có đơn hàng mới
- [x] Frontend (admin): Icon chuông trên header + badge số đơn mới
- [x] Frontend (admin): Dropdown danh sách thông báo
- [x] Frontend (admin): Âm thanh khi có đơn mới (optional)
- [x] Git push

---

### B13: Export báo cáo (CSV/Excel) ✅
- [x] Backend API: `GET /api/admin/orders/export?format=csv&from=&to=`
- [x] Backend API: `GET /api/admin/products/export?format=csv`
- [x] Frontend (admin): Nút "Xuất báo cáo" trên trang Đơn hàng + Sản phẩm
- [x] Frontend (admin): Chọn khoảng thời gian + format (CSV / Excel)
- [x] Git push

---

### B14: Ảnh sản phẩm nhiều tấm (Gallery) ⚠️ Một phần
- [x] Database: Bảng `product_images` riêng (hiện dùng `images TEXT[]` trong `products` — khác thiết kế ban đầu)
- [x] Backend: Upload nhiều ảnh cho 1 sản phẩm (4 slot ảnh trong admin, lưu vào mảng `images`)
- [x] Backend: API sắp xếp thứ tự ảnh (thứ tự dựa vào vị trí trong mảng, chưa có drag-sort API)
- [x] Frontend (client): Gallery slider trên trang chi tiết với thumbnail (chưa có lightbox)
- [x] Frontend (admin): Drag-drop sắp xếp ảnh khi thêm/sửa sản phẩm
- [ ] Git push

---

### B15: Biến thể sản phẩm (Variants) ✅
- [x] Database: Bảng `product_variants` (product_id, ml, price, original_price, stock, is_default) — migration `016_product_variants.sql`
- [x] Backend: API CRUD variant khi thêm/sửa sản phẩm (`upsert_variants` trong `product_repo.rs`)
- [x] Backend: Trừ stock theo variant khi đặt hàng + hoàn stock khi huỷ
- [x] Frontend (client): Chọn dung tích (ml) trên trang chi tiết → cập nhật giá + stock realtime
- [x] Frontend (admin): Quản lý variant (thêm/xoá dung tích, giá, stock) trong form sản phẩm
- [x] Git push

---

### B16: Breadcrumb Navigation ✅
- [x] Frontend: Component `Breadcrumb` dùng chung (`components/ui/breadcrumb.tsx`)
- [x] Frontend: Tự động generate từ route path (`useBreadcrumbs` hook — tích hợp vào `AdminLayout` header)
- [x] Áp dụng cho: tất cả trang admin (qua AdminLayout), trang Products và ProductDetail (client)
- [x] Git push

---

## Thứ tự thực hiện

```
B1 → B2 → B3 → B4 → B5 → B6 → B7 → B8
          ─── CORE XONG ───
B9 → B10 → B11 → B12 → B13 → B14 → B15 → B16
          ─── NÊN CÓ XONG ───
```
