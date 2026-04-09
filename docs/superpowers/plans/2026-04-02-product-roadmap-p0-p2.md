# Small Shop Roadmap (P0 / P1 / P2)

Ngày: 2026-04-02
Mục tiêu: đẩy project từ “MVP đầy đủ” sang trạng thái vận hành ổn định + sẵn scale.

---

## P0 — Bắt buộc trước khi coi là production-ready

### 1) JWT hardening + logout invalidation
- Việc làm:
  - Thêm cơ chế blacklist/denylist token (ưu tiên Redis; fallback DB table).
  - Logout phải vô hiệu token ngay lập tức.
  - Chuẩn bị phương án chuyển dần sang cặp access/refresh token.
- Gợi ý điểm chạm:
  - [backend/src/middleware/auth.rs](../../../backend/src/middleware/auth.rs)
  - [backend/src/models/user.rs](../../../backend/src/models/user.rs)
  - [backend/src/services/auth_service.rs](../../../backend/src/services/auth_service.rs)
- Acceptance:
  - Token đã logout không dùng được ở endpoint protected.
  - Có test cho flow login -> logout -> gọi lại endpoint protected bị từ chối.

### 2) OAuth edge-case rõ ràng (email trùng khác `google_id`)
- Việc làm:
  - Trả message lỗi rõ, không mơ hồ.
  - Log audit để hỗ trợ debug/account recovery.
- Gợi ý điểm chạm:
  - [backend/src/services/auth_service.rs](../../../backend/src/services/auth_service.rs)
  - [backend/src/handlers/client/user.rs](../../../backend/src/handlers/client/user.rs)
- Acceptance:
  - Case xung đột tài khoản trả đúng status code + error payload nhất quán.

### 3) Smoke test luồng sống còn
- Việc làm:
  - Thêm smoke tests cho: admin login, customers list, checkout tạo đơn, update order status.
- Gợi ý điểm chạm:
  - [test/backend](../../../test/backend)
  - [test/frontend](../../../test/frontend)
- Acceptance:
  - Chạy test qua trong CI/local một lệnh.

### 4) Operational logs chuẩn hóa
- Việc làm:
  - Correlation/request id cho request quan trọng.
  - Log denials (permission/auth) theo format thống nhất.
- Gợi ý điểm chạm:
  - [backend/src/main.rs](../../../backend/src/main.rs)
  - [backend/src/middleware](../../../backend/src/middleware)
  - [backend/src/services/permissions_service.rs](../../../backend/src/services/permissions_service.rs)
- Acceptance:
  - Có thể truy dấu nhanh một request từ đầu đến cuối.

Trạng thái hiện tại:
- Đã thêm `X-Request-Id` tự động ở middleware HTTP (set + propagate).
- Permission denials đã có structured logging trong `permissions_service`.

---

## P1 — Nên làm ngay sau P0 (tăng chất lượng vận hành)

### 1) Admin UX polish
- Việc làm:
  - Chuẩn hóa skeleton/loading/empty/error states cho Customers, Orders, Products.
  - Debounce search + giữ state filter khi quay lại trang.
- Gợi ý điểm chạm:
  - [frontend/src/pages/admin/Customers.tsx](../../../frontend/src/pages/admin/Customers.tsx)
  - [frontend/src/pages/admin/Orders.tsx](../../../frontend/src/pages/admin/Orders.tsx)
  - [frontend/src/pages/admin](../../../frontend/src/pages/admin)
- Acceptance:
  - Không còn trang “trắng” khi API trả payload bất thường.

### 2) Inventory safety
- Việc làm:
  - Cảnh báo low stock theo ngưỡng cấu hình.
  - Chặn race condition khi nhiều admin chỉnh tồn kho gần đồng thời (optimistic lock/version).
- Gợi ý điểm chạm:
  - [backend/src/handlers/admin/product.rs](../../../backend/src/handlers/admin/product.rs)
  - [backend/src/repositories/product_repo.rs](../../../backend/src/repositories/product_repo.rs)
  - [frontend/src/pages/admin/Inventory.tsx](../../../frontend/src/pages/admin/Inventory.tsx)
- Acceptance:
  - Không ghi đè mất dữ liệu tồn kho khi cập nhật cạnh tranh.

### 3) Data governance
- Việc làm:
  - Soft delete cho entities nhạy cảm (product/category/coupon nếu phù hợp).
  - Audit trail cho thao tác admin quan trọng.
- Gợi ý điểm chạm:
  - [sql](../../../sql)
  - [backend/src/repositories](../../../backend/src/repositories)
- Acceptance:
  - Có thể truy lịch sử thay đổi chính.

---

## P2 — Nice to have (thương mại hóa mạnh hơn)

### 1) Marketing features
- Flash sale theo khung giờ.
- Campaign banner theo segment.
- Abandoned cart reminder.

### 2) Growth analytics
- Funnel view: product view -> add to cart -> checkout -> paid.
- Conversion theo nguồn traffic/campaign.

### 3) CS tooling
- Timeline khách hàng (đơn hàng, liên hệ, coupon usage, review).
- Mẫu phản hồi nhanh cho contact/support.

---

## Thứ tự triển khai đề xuất (2–4 tuần)

### Tuần 1
- P0.1 JWT invalidation
- P0.2 OAuth conflict handling

### Tuần 2
- P0.3 Smoke tests
- P0.4 Operational logs

### Tuần 3
- P1.1 Admin UX polish
- P1.2 Inventory safety

### Tuần 4
- P1.3 Data governance + review P2 backlog

---

## Definition of Done chung
- Có test (unit/integration) cho rule mới.
- Không phá backward compatibility API hiện có (trừ khi có migration note).
- Cập nhật tài liệu liên quan:
  - [README.md](../../../README.md)
  - [backend/README.md](../../../backend/README.md)
  - [backend/CODE_NOTES.md](../../../backend/CODE_NOTES.md)

---

## Ghi chú automation smoke test (đã bổ sung)
- Script PowerShell: [scripts/smoke-admin.ps1](../../../scripts/smoke-admin.ps1)
- Script Bash: [scripts/smoke-admin.sh](../../../scripts/smoke-admin.sh)

Hai script sẽ kiểm tra nhanh chuỗi:
- admin login
- gọi `/api/admin/me`, `/api/admin/customers`, `/api/admin/orders`
- admin logout
- xác nhận token cũ bị từ chối
