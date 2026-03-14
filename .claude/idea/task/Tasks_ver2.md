# Kế hoạch xử lý triệt để (ưu tiên đầu tiên)

> Cập nhật: 2026-03-14
> Mục tiêu: chọn **1 feature** làm thật end-to-end (DB → API → UI → test), không còn placeholder.

---

## ✅ Plan mới theo yêu cầu: **Feature Giảm Giá chuẩn e-commerce (B21)**

> Cập nhật: 2026-03-15
> Mục tiêu: hiển thị đúng kiểu “Regular price / Price / Save %”, tính giá nhất quán từ backend, không lệch giữa Product Card, Product Detail, Cart, Checkout.

### Vì sao làm ngay
- Hiện trạng logic giá giảm đang rải rác, dễ lệch giữa các màn.
- Admin đã có dữ liệu `price` + `original_price` nhưng client chưa chuẩn hóa hiển thị.
- Cần backend trả dữ liệu giảm giá rõ ràng để frontend chỉ render, không tự “đoán” logic.

---

## 0) Nguyên tắc nghiệp vụ chốt

- Giá gốc (`regular_price`) là `original_price` nếu có và lớn hơn `price`.
- Giá bán (`final_price`) là `price`.
- Phần trăm giảm (`discount_percent`) tính từ backend:
	- `round((regular_price - final_price) / regular_price * 100)`
- Nếu `original_price <= price` hoặc null => xem như không giảm giá.
- Toàn bộ màn hình dùng chung 1 nguồn dữ liệu trả từ API, không tự tính lại khác công thức.

---

## 1) Phạm vi MVP (làm triệt để)

### Backend
- Mở rộng response sản phẩm (list + detail + related) với trường tính sẵn:
	- `regular_price`
	- `final_price`
	- `discount_amount`
	- `discount_percent`
	- `is_on_sale`
- Với sản phẩm có variant:
	- Trả thêm `display_variant_ml` (ưu tiên 100ml, fallback gần 100ml)
	- Trả thêm `price_per_100ml` cho màn chi tiết.
- Đảm bảo API cart/checkout/order snapshot dùng đúng `final_price` tại thời điểm đặt.

### Frontend
- Product Card:
	- Nếu `is_on_sale` => hiện giá gốc gạch ngang + giá bán.
- Product Detail:
	- Block giá chuẩn:
		- Regular price
		- Price
		- Save X%
		- `(xx đ / 100ml)` nếu có variant.
- Cart + Checkout:
	- Hiển thị nhất quán giá giảm, subtotal, total.
- Không phụ thuộc badge để tính giảm giá (badge chỉ để phân section marketing).

---

## 2) Kế hoạch triển khai chi tiết

### Bước A — Chuẩn hóa pricing DTO (0.5 ngày)
- Thêm `PricingView` hoặc các field pricing vào `ProductPublic`.
- Viết helper tính giá giảm tập trung trong backend (không copy-paste).

**File dự kiến:**
- `backend/src/models/product.rs`
- `backend/src/repositories/product_repo.rs`

---

### Bước B — Áp pricing vào tất cả endpoint liên quan (0.5 ngày)
- `GET /api/products`
- `GET /api/products/:slug`
- `GET /api/products/:slug/related`
- Nếu cần: endpoint cart/order trả line item có `regular_price`, `final_price`, `discount_percent`.

**File dự kiến:**
- `backend/src/handlers/client/product.rs`
- `backend/src/repositories/product_repo.rs`
- `backend/src/handlers/client/cart.rs`
- `backend/src/handlers/client/order.rs`

---

### Bước C — Product Card + Product Detail UI (1 ngày)
- Product Card: hiển thị giá giảm gọn.
- Product Detail: layout theo mẫu “Regular / Price / Save %”.
- Variant switching: đổi giá realtime theo variant đang chọn.
- Tránh hiển thị “Save 0%”.

**File dự kiến:**
- `frontend/src/components/shop/PriceDisplay.tsx`
- `frontend/src/components/shop/ProductCard.tsx`
- `frontend/src/pages/client/ProductDetail.tsx`
- `frontend/src/hooks/useProducts.ts`

---

### Bước D — Cart/Checkout đồng bộ pricing (0.5–1 ngày)
- Dùng một nguồn field từ API để render.
- Kiểm tra subtotal/total khớp backend.
- Trường hợp variant hết hàng hoặc đổi giá giữa chừng: backend trả lỗi rõ.

**File dự kiến:**
- `frontend/src/contexts/CartContext.tsx`
- `frontend/src/pages/client/Cart.tsx`
- `frontend/src/pages/client/Checkout.tsx`

---

### Bước E — Admin UX cho giảm giá (0.5 ngày)
- Form admin sản phẩm:
	- Validate `original_price > price` nếu muốn bật giảm giá.
	- Gợi ý tự tính `% giảm` để admin dễ kiểm soát.
- Variant form cũng áp rule tương tự.

**File dự kiến:**
- `frontend/src/pages/admin/Products.tsx`
- `backend/src/handlers/admin/product.rs`

---

### Bước F — Test + regression (1 ngày)
- Backend test:
	- Không giảm giá
	- Có giảm giá
	- original <= final
	- variant 100ml và fallback gần 100ml
- Frontend test:
	- Card/detail/cart render đúng khi có/không có giảm.
	- Variant đổi thì giá + save% đổi đúng.

**File dự kiến:**
- `backend/src/tests/...`
- `frontend/src/test/...`

---

## 3) Definition of Done (B21)

- [ ] API trả pricing fields đầy đủ (`is_on_sale`, `regular_price`, `final_price`, `%`)
- [ ] Product Card hiển thị đúng giá giảm
- [ ] Product Detail hiển thị đúng block “Regular / Price / Save % / giá trên 100ml”
- [ ] Cart/Checkout khớp giá backend
- [ ] Không còn công thức giảm giá trùng lặp ở nhiều chỗ
- [ ] `cargo check` pass
- [ ] `bun run build` pass
- [ ] Test pass

---

## 4) Timeline đề xuất

- Ngày 1: Bước A + B
- Ngày 2: Bước C + D
- Ngày 3: Bước E + F + fix bug

=> Tổng: **2.5–3 ngày**.

---

## ✅ Feature nên xử lý đầu tiên: **Admin Customers (B17)**

### Vì sao chọn trước
- Frontend hiện vẫn là placeholder: trang khách hàng chỉ hiển thị "đang phát triển".
- Backend endpoint đã có route nhưng handler đang trả mảng rỗng.
- Đây là màn hình vận hành quan trọng cho admin (đối soát user, CSKH, thống kê tăng trưởng).

---

## 1) Phạm vi chốt cho phiên bản đầu (MVP)

### Backend
- `GET /api/admin/customers`
	- Query: `search`, `page`, `limit`, `sort` (`newest|oldest|name_asc|name_desc`)
	- Trả về phân trang chuẩn:
		- `items`
		- `total`
		- `page`
		- `limit`
		- `total_pages`

### Frontend
- Thay toàn bộ placeholder ở trang khách hàng bằng:
	- bảng danh sách khách
	- ô tìm kiếm
	- sort
	- phân trang
	- loading + empty state + error state

### Chưa làm trong vòng này
- Chỉnh role user
- Soft-delete/ban user
- Export customer CSV

---

## 2) Kế hoạch triển khai chi tiết

### Bước A — Thiết kế contract + DTO (0.5 ngày)
- Thêm model response cho customer list trong backend models.
- Định nghĩa query params + validate (`limit` max 100).

**File dự kiến:**
- `backend/src/models/admin.rs`
- `backend/src/handlers/admin/customer.rs`

---

### Bước B — Repository query thật từ DB (0.5–1 ngày)
- Viết query lấy danh sách user từ bảng `users`.
- Hỗ trợ `search` theo `name`, `email`, `phone`.
- Hỗ trợ sort + offset pagination.
- Query `COUNT(*)` riêng để tính `total_pages`.

**File dự kiến:**
- `backend/src/repositories/user_repo.rs` (hoặc tách `admin_customer_repo.rs` nếu muốn tách domain admin rõ hơn)

---

### Bước C — Handler + route response chuẩn (0.5 ngày)
- Thay handler trả `[]` bằng dữ liệu thật.
- Trả đúng schema phân trang.
- Chuẩn hóa lỗi (`400` cho query invalid, `500` cho DB error).

**File dự kiến:**
- `backend/src/handlers/admin/customer.rs`

---

### Bước D — Frontend page thật (1 ngày)
- Thêm type `AdminCustomer` + `PaginatedResponse<AdminCustomer>`.
- Gọi API thật bằng `adminGet`.
- Render bảng + filter + pagination.
- Debounce search (300ms) để giảm spam request.

**File dự kiến:**
- `frontend/src/lib/admin-api.ts`
- `frontend/src/pages/admin/Customers.tsx`

---

### Bước E — Test + hardening (1 ngày)
- Backend:
	- test list mặc định
	- test search
	- test pagination boundary (`page > total_pages`)
	- test sort
- Frontend:
	- test loading/empty/error/data state
	- test search và đổi trang

**File dự kiến:**
- `backend/src/tests/...` (thêm test cho admin customers)
- `frontend/src/test/...` (thêm test cho Customers)

---

## 3) Điều kiện hoàn thành (Definition of Done)

- [ ] Không còn placeholder ở trang Admin Customers
- [ ] Endpoint `/api/admin/customers` trả dữ liệu thật từ DB
- [ ] Có search + sort + pagination hoạt động thực tế
- [ ] Build pass:
	- [ ] `cargo check`
	- [ ] `bun run build`
- [ ] Test pass (backend + frontend)
- [ ] Không phát sinh lỗi lint/type mới

---

## 4) Thứ tự ưu tiên sau khi xong B17

1. **B18 — Permissions động từ backend** (bỏ matrix hardcode ở UI)
2. **B19 — Customer detail drawer** (lịch sử đơn, tổng chi tiêu)
3. **B20 — Customer export CSV**

---

## 5) Timeline gợi ý

- Ngày 1: Bước A + B
- Ngày 2: Bước C + D
- Ngày 3: Bước E + fix bug + nghiệm thu

=> Tổng: **2.5–3 ngày** để chốt feature triệt để.

