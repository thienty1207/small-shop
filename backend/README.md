# Backend Workflow Guide (Small Shop)

Tài liệu này giúp team nhìn nhanh luồng xử lý backend và ranh giới trách nhiệm giữa `routes` / `handlers` / `services` / `repositories`.

> Ghi chú mục đích theo từng file xem tại **`backend/CODE_NOTES.md`**.

## 1) Mục tiêu kiến trúc

- Dễ đọc, dễ onboard junior.
- Tránh nhầm vai trò giữa lớp định tuyến và lớp xử lý nghiệp vụ.
- Giảm việc “logic rơi nhầm chỗ” gây khó test và khó maintain.

## 2) Luồng request chuẩn

Client request
→ `routes/*` (map URL + method + middleware)
→ `handlers/*` (parse input, gọi service, trả response)
→ `services/*` (business rules, orchestration)
→ `repositories/*` (SQL/DB only)
→ DB

Response quay ngược lại:
DB → repository → service → handler → client

## 3) Vai trò từng folder

### `src/routes/`

Chỉ làm:
- Khai báo endpoint (`.route`, `.merge`, `.nest`).
- Gắn middleware (`jwt_auth`, admin guard, ...).
- Tổ chức nhóm API theo domain.

Không làm:
- Không viết business logic.
- Không truy cập DB.

### `src/handlers/`

Chỉ làm:
- Nhận `State`, `Path`, `Query`, `Json`, `Multipart`, `Extension`.
- Validate input ở mức HTTP/request shape.
- Gọi service tương ứng.
- Map sang `Json`, `StatusCode`, error HTTP.

Không làm:
- Không viết SQL.
- Không chứa business rules dài/dễ tái sử dụng.

### `src/services/`

Chỉ làm:
- Business logic, quy tắc nghiệp vụ.
- Orchestrate nhiều repository/service ngoài (OAuth, email, cloudinary...).
- Chuẩn hóa luồng thành các hàm có thể test độc lập.

Không làm:
- Không map route.
- Không phụ thuộc trực tiếp vào framework HTTP nếu không cần.

### `src/repositories/`

Chỉ làm:
- Tương tác DB (`sqlx`, query, transaction).
- Trả model thuần dữ liệu.

Không làm:
- Không chứa business policy.
- Không xử lý HTTP concerns.

## 4) Quy tắc ranh giới (quan trọng)

1. `routes` → gọi `handlers`.
2. `handlers` → gọi `services`.
3. `services` → gọi `repositories`.
4. `handlers` **không gọi thẳng** `repositories` (trừ khi legacy, cần TODO migrate).
5. Một endpoint mới phải có đường đi rõ từ route đến service.

## 5) Checklist khi thêm API mới

Ví dụ thêm `GET /api/foo`:

1. Tạo route tại `src/routes/foo.rs`.
2. Tạo handler tại `src/handlers/client/foo.rs` hoặc `src/handlers/admin/foo.rs`.
3. Tạo service function tại `src/services/foo_service.rs`.
4. Nếu cần DB, thêm hàm trong `src/repositories/foo_repo.rs`.
5. Gắn module vào `src/routes/mod.rs`.
6. Viết test cho service + integration route.

## 6) Workflow thực tế cho một endpoint

Ví dụ: cập nhật avatar user

1. Route bảo vệ JWT.
2. Handler nhận multipart + user hiện tại.
3. Service validate file, upload Cloudinary, cập nhật avatar.
4. Repository update `users.avatar_url`.
5. Handler trả user public mới.

## 7) Đề xuất nâng điểm cấu trúc (7.5 → 8.5+)

- Di chuyển phần gọi trực tiếp `repo` trong handler sang service.
- Tách `settings` route khỏi module `product` nếu khác domain.
- Giữ comment/module doc khớp đúng code thực tế.
- (Tùy chọn) Tách rõ DTO request/response riêng khỏi DB models.

## 8) Quy ước naming gợi ý

- Route file: `routes/<domain>.rs`
- Handler file: `handlers/{client|admin}/<domain>.rs`
- Service file: `services/<domain>_service.rs`
- Repo file: `repositories/<domain>_repo.rs`

Ví dụ function:
- `routes::product::routes()`
- `handlers::client::product::get_product()`
- `services::product_service::get_product_detail()`
- `repositories::product_repo::find_by_slug()`

---

Nếu team thống nhất theo tài liệu này, mọi PR backend nên check nhanh 2 câu:

1. Logic nghiệp vụ đã nằm trong `services` chưa?
2. `handlers` còn đang gọi thẳng `repositories` không?

---

## Deploy notes (Railway)

- Backend listens on `0.0.0.0:$SERVER_PORT`.
- Healthcheck endpoints:
	- `GET /healthz` (process alive)
	- `GET /readyz` (DB reachable)
- Use [backend/.env.example](.env.example) as baseline for environment variables.

