# Small Shop — Task List

> Cập nhật lần cuối: 2026-03-05
> Mỗi task hoàn thành sẽ được đánh dấu `[x]`

---

## 🔴 CORE BUSINESS — Phải có

### B1: Admin Sidebar + Skeleton Pages
- [ ] Rebuild `AdminLayout.tsx` với collapsible sub-menu
- [ ] Sidebar structure:
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
- [ ] Tạo skeleton pages cho tất cả routes mới
- [ ] Wire routes trong `App.tsx`
- [ ] Test navigation hoạt động đúng
- [ ] `cargo check` + `bun run build` pass
- [ ] Git push

---

### B2: Admin CRUD Sản phẩm + Upload ảnh
- [ ] Backend API: `GET /api/admin/products` (list, search, filter, phân trang)
- [ ] Backend API: `POST /api/admin/products` (tạo mới)
- [ ] Backend API: `PUT /api/admin/products/:id` (cập nhật)
- [ ] Backend API: `DELETE /api/admin/products/:id` (xoá / soft-delete)
- [ ] Backend API: Upload ảnh sản phẩm (lưu local hoặc R2/S3)
- [ ] Backend API: CRUD danh mục (`/api/admin/categories`)
- [ ] Frontend: Trang "Tất cả sản phẩm" — bảng data, search, filter theo danh mục
- [ ] Frontend: Modal/drawer thêm sản phẩm (tên, giá, mô tả, danh mục, ảnh, stock)
- [ ] Frontend: Inline edit / modal sửa sản phẩm
- [ ] Frontend: Xác nhận xoá sản phẩm
- [ ] Frontend: Trang "Danh mục" — CRUD inline
- [ ] Frontend: Upload ảnh với preview trước khi submit
- [ ] Test backend + frontend
- [ ] Git push

---

### B3: Admin Quản lý Đơn hàng + Email thông báo
- [ ] Backend API: `GET /api/admin/orders` (list, filter theo status, search theo mã đơn/tên khách)
- [ ] Backend API: `PUT /api/admin/orders/:id/status` (đổi trạng thái + ghi chú)
- [ ] Backend API: `GET /api/admin/orders/:id` (chi tiết đơn hàng)
- [ ] Backend: Gửi email tự động cho khách khi đổi trạng thái
- [ ] Frontend: Trang "Quản lý Đơn hàng" — bảng data với filter tabs:
  - Tất cả | Chờ xử lý | Đã xác nhận | Đang giao | Đã giao | Đã huỷ
- [ ] Frontend: Quick action button theo context:
  - pending → "✓ Xác nhận"
  - confirmed → "🚚 Giao hàng"
  - shipping → "✅ Đã giao"
  - any → "✗ Huỷ đơn"
- [ ] Frontend: Modal xác nhận đổi trạng thái + ô ghi chú
- [ ] Frontend: Trang chi tiết đơn hàng (sản phẩm, khách hàng, timeline trạng thái)
- [ ] Test backend + frontend
- [ ] Git push

---

### B4: Admin Dashboard thật (từ DB)
- [ ] Backend API: `GET /api/admin/dashboard/stats` — trả về:
  - Tổng doanh thu (hôm nay / tuần / tháng)
  - Tổng đơn hàng (theo trạng thái)
  - Tổng khách hàng
  - Tổng sản phẩm (đang bán / hết hàng)
- [ ] Backend API: `GET /api/admin/dashboard/recent-orders` — 10 đơn gần nhất
- [ ] Backend API: `GET /api/admin/dashboard/revenue-chart` — doanh thu 6 tháng gần nhất
- [ ] Backend API: `GET /api/admin/dashboard/top-products` — top 5 sản phẩm bán chạy
- [ ] Frontend: Thay toàn bộ mock data bằng API thật
- [ ] Frontend: Chart doanh thu (CSS hoặc lightweight lib)
- [ ] Test backend
- [ ] Git push

---

### B5: Tìm kiếm + Lọc + Sắp xếp + Phân trang (Client)
- [ ] Backend API: `GET /api/products?search=&category=&sort=&page=&limit=`
- [ ] Backend: Full-text search tiếng Việt (unaccent + tsvector hoặc ILIKE)
- [ ] Backend: Sort options: `price_asc`, `price_desc`, `newest`, `best_selling`
- [ ] Backend: Phân trang (offset-based) + trả `total_count` cho pagination UI
- [ ] Frontend: Thanh search trên Header hoạt động thật (debounce 300ms)
- [ ] Frontend: Trang Products — filter sidebar theo danh mục
- [ ] Frontend: Trang Products — dropdown sắp xếp
- [ ] Frontend: Trang Products — pagination component
- [ ] Test backend + frontend
- [ ] Git push

---

### B6: Tồn kho (Stock Management)
- [ ] Backend: Thêm cột `stock` vào bảng `products` (migration)
- [ ] Backend: Trừ stock khi đặt hàng thành công (transaction)
- [ ] Backend: Hoàn stock khi huỷ đơn
- [ ] Backend: Check stock trước khi checkout → trả lỗi nếu không đủ
- [ ] Frontend (client): Hiện "Hết hàng" khi stock = 0, disable nút "Thêm vào giỏ"
- [ ] Frontend (client): Hiện "Còn X sản phẩm" khi stock thấp (< 5)
- [ ] Frontend (admin): Hiện cột stock trong bảng sản phẩm
- [ ] Frontend (admin): Cảnh báo sản phẩm sắp hết hàng trên Dashboard
- [ ] Test backend
- [ ] Git push

---

### B7: Role System (Phân quyền nhân viên)
- [ ] Database: Bảng `staff` (id, username, password_hash, full_name, role, is_active)
- [ ] Database: Bảng `permissions` hoặc role-based config
- [ ] Backend: Mở rộng `admin_guard` — kiểm tra role + permission cho từng route
- [ ] Backend: API CRUD staff (`/api/admin/staff`)
- [ ] Backend: API gán role cho staff
- [ ] Roles:
  | Role | Quyền |
  |---|---|
  | `super_admin` | Toàn quyền |
  | `manager` | Sản phẩm + Đơn hàng + Xem khách hàng. Không vào Cài đặt, Phân quyền |
  | `staff` | Chỉ xem + xử lý đơn hàng |
- [ ] Frontend: Trang "Nhân viên" — CRUD + gán role
- [ ] Frontend: Trang "Phân quyền" — matrix role × permission
- [ ] Frontend: Ẩn/disable menu + button theo quyền hiện tại
- [ ] Test backend + frontend
- [ ] Git push

---

### B8: Cài đặt hệ thống
- [ ] Database: Bảng `shop_settings` (key-value store)
- [ ] Backend API: `GET /api/admin/settings` — lấy toàn bộ settings
- [ ] Backend API: `PUT /api/admin/settings` — cập nhật settings
- [ ] Backend API: Upload ảnh hero/banner
- [ ] Frontend — Trang "Giao diện":
  - [ ] Quản lý Hero slides (thêm/sửa/xoá slide, upload ảnh, chỉnh text + CTA)
  - [ ] Quản lý Banner khuyến mãi (ảnh + link)
  - [ ] Chọn font chữ (Google Fonts picker)
  - [ ] Preview trước khi lưu
- [ ] Frontend — Trang "Thông tin cửa hàng":
  - [ ] Tên shop, logo, địa chỉ, SĐT, email
  - [ ] Social links (Facebook, Instagram, TikTok)
- [ ] Frontend — Trang "Vận chuyển & Phí":
  - [ ] Phí ship mặc định
  - [ ] Miễn phí ship từ X đồng
- [ ] Frontend — Trang "Email template":
  - [ ] Xem trước email xác nhận đơn / đổi trạng thái
  - [ ] Sửa nội dung template (text, logo)
- [ ] Client-side: Đọc settings từ API thay vì hardcode (hero, font, thông tin shop)
- [ ] Test backend
- [ ] Git push

---

## 🟡 NÊN CÓ — UX tốt hơn

### B9: Wishlist / Yêu thích
- [ ] Database: Bảng `wishlists` (user_id, product_id)
- [ ] Backend API: `POST /api/wishlist/:product_id` (toggle yêu thích)
- [ ] Backend API: `GET /api/wishlist` (danh sách yêu thích)
- [ ] Frontend: Nút trái tim trên card sản phẩm + trang chi tiết
- [ ] Frontend: Trang "Yêu thích" trong account
- [ ] Git push

---

### B10: Đánh giá sản phẩm
- [ ] Database: Bảng `reviews` (user_id, product_id, rating 1-5, comment, created_at)
- [ ] Backend: Chỉ cho phép review nếu đã mua + đơn đã giao
- [ ] Backend API: `POST /api/products/:id/reviews`
- [ ] Backend API: `GET /api/products/:id/reviews` (phân trang)
- [ ] Frontend (client): Form review trên trang chi tiết sản phẩm
- [ ] Frontend (client): Hiện rating trung bình + số lượng review trên card
- [ ] Frontend (admin): Quản lý review (xoá review spam)
- [ ] Git push

---

### B11: Mã giảm giá / Voucher
- [ ] Database: Bảng `coupons` (code, type, value, min_order, max_uses, expires_at)
- [ ] Backend: Validate coupon khi checkout
- [ ] Backend API: CRUD coupon cho admin
- [ ] Frontend (client): Ô nhập mã giảm giá ở trang Checkout
- [ ] Frontend (admin): Trang quản lý mã giảm giá
- [ ] Git push

---

### B12: Thông báo realtime (Admin)
- [ ] Backend: WebSocket hoặc SSE endpoint
- [ ] Backend: Gửi notification khi có đơn hàng mới
- [ ] Frontend (admin): Icon chuông trên header + badge số đơn mới
- [ ] Frontend (admin): Dropdown danh sách thông báo
- [ ] Frontend (admin): Âm thanh khi có đơn mới (optional)
- [ ] Git push

---

### B13: Export báo cáo (CSV/Excel)
- [ ] Backend API: `GET /api/admin/orders/export?format=csv&from=&to=`
- [ ] Backend API: `GET /api/admin/products/export?format=csv`
- [ ] Frontend (admin): Nút "Xuất báo cáo" trên trang Đơn hàng + Sản phẩm
- [ ] Frontend (admin): Chọn khoảng thời gian + format (CSV / Excel)
- [ ] Git push

---

### B14: Ảnh sản phẩm nhiều tấm (Gallery)
- [ ] Database: Bảng `product_images` (product_id, url, position, is_primary)
- [ ] Backend: Upload nhiều ảnh cho 1 sản phẩm
- [ ] Backend: API sắp xếp thứ tự ảnh
- [ ] Frontend (client): Gallery slider trên trang chi tiết (thumbnail + lightbox)
- [ ] Frontend (admin): Drag-drop sắp xếp ảnh khi thêm/sửa sản phẩm
- [ ] Git push

---

### B15: Biến thể sản phẩm (Variants)
- [ ] Database: Bảng `product_variants` (product_id, size, color, price, stock, sku)
- [ ] Backend: API CRUD variant khi thêm/sửa sản phẩm
- [ ] Backend: Trừ stock theo variant khi đặt hàng
- [ ] Frontend (client): Chọn size/màu trên trang chi tiết → cập nhật giá + stock
- [ ] Frontend (admin): Quản lý variant trong form sản phẩm
- [ ] Git push

---

### B16: Breadcrumb Navigation
- [ ] Frontend: Component `Breadcrumb` dùng chung
- [ ] Frontend: Tự động generate từ route path
- [ ] Áp dụng cho: Sản phẩm → Danh mục → Chi tiết
- [ ] Git push

---

## Thứ tự thực hiện

```
B1 → B2 → B3 → B4 → B5 → B6 → B7 → B8
          ─── CORE XONG ───
B9 → B10 → B11 → B12 → B13 → B14 → B15 → B16
          ─── NÊN CÓ XONG ───
```
