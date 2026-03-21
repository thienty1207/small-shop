# Backend Code Notes (Small Shop)

Tài liệu này ghi chú mục đích của **toàn bộ file Rust trong `backend/src`** để đọc code nhanh, giảm tình trạng “mở file ra nhưng không biết file này phục vụ gì”.

## Quy ước đọc nhanh
- `routes`: map endpoint + middleware.
- `handlers`: nhận request/validate HTTP-level, gọi service, trả response.
- `services`: xử lý nghiệp vụ.
- `repositories`: truy vấn DB.
- `models`: schema dữ liệu/DTO.
- `middleware`: authn/authz.

---

## 1) Root modules
- `src/main.rs`: điểm khởi động server Axum, nạp config, tạo state, mount router.
- `src/lib.rs`: export các module backend để dùng chung trong crate/tests.
- `src/config.rs`: đọc và validate biến môi trường, gom thành cấu hình runtime.
- `src/state.rs`: định nghĩa `AppState` chứa DB pool, config và các client dùng chung.
- `src/error.rs`: error trung tâm (`AppError`) và map lỗi sang HTTP response chuẩn.

## 2) Handlers
### `src/handlers/mod.rs`
- `src/handlers/mod.rs`: module aggregator cho handlers admin/client.

### `src/handlers/admin`
- `src/handlers/admin/mod.rs`: gom module handler admin.
- `src/handlers/admin/auth.rs`: đăng nhập admin, lấy profile admin hiện tại.
- `src/handlers/admin/category.rs`: CRUD danh mục phía admin.
- `src/handlers/admin/coupon.rs`: validate coupon và CRUD coupon cho admin.
- `src/handlers/admin/customer.rs`: endpoint khách hàng (hiện stub/TODO mở rộng).
- `src/handlers/admin/dashboard.rs`: trả dữ liệu thống kê dashboard admin.
- `src/handlers/admin/export.rs`: export orders/products sang CSV/Excel (BOM, escape CSV, text cell cho Excel).
- `src/handlers/admin/notifications.rs`: stream thông báo admin (SSE/polling).
- `src/handlers/admin/order.rs`: danh sách/chi tiết đơn và cập nhật trạng thái đơn.
- `src/handlers/admin/product.rs`: CRUD sản phẩm admin, upload/reorder ảnh, quản lý tồn kho/variant.
- `src/handlers/admin/review.rs`: quản trị review (list/xóa).
- `src/handlers/admin/settings.rs`: lấy/cập nhật settings cho admin và endpoint public settings.
- `src/handlers/admin/staff.rs`: quản lý tài khoản staff/admin (thường yêu cầu `super_admin`).

### `src/handlers/client`
- `src/handlers/client/mod.rs`: gom module handler client.
- `src/handlers/client/cart.rs`: API giỏ hàng user đăng nhập.
- `src/handlers/client/contact.rs`: nhận form liên hệ từ client.
- `src/handlers/client/order.rs`: đặt hàng, xem đơn của user hiện tại.
- `src/handlers/client/product.rs`: API public sản phẩm/danh mục/chi tiết/related.
- `src/handlers/client/review.rs`: list/upsert review theo sản phẩm cho user/client.
- `src/handlers/client/user.rs`: OAuth Google callback/login, profile me, update profile/avatar.
- `src/handlers/client/wishlist.rs`: toggle và lấy wishlist user.

## 3) Middleware
- `src/middleware/mod.rs`: module aggregator middleware.
- `src/middleware/auth.rs`: JWT middleware cho user, inject user vào request extension.
- `src/middleware/admin_guard.rs`: middleware authz admin (role, active status).

## 4) Models
- `src/models/mod.rs`: module aggregator models.
- `src/models/admin.rs`: model/DTO cho admin auth, staff và dữ liệu dashboard admin.
- `src/models/cart.rs`: model cart item + DTO add/update cart.
- `src/models/contact.rs`: model contact message + request DTO.
- `src/models/coupon.rs`: model coupon + DTO create/update/validate.
- `src/models/order.rs`: model order/order_item + DTO đặt hàng/list/filter/admin.
- `src/models/product.rs`: model product/category/variant + DTO query/admin/input.
- `src/models/review.rs`: model review + DTO review input/query/output.
- `src/models/settings.rs`: model key-value shop settings + DTO cập nhật.
- `src/models/user.rs`: model user, JWT claims, OAuth payload, profile DTO.
- `src/models/wishlist.rs`: model quan hệ wishlist user-product.

## 5) Repositories
- `src/repositories/mod.rs`: module aggregator repositories.
- `src/repositories/admin_repo.rs`: truy vấn `admin_users` (find/create/list/update/delete staff/admin).
- `src/repositories/cart_repo.rs`: truy vấn cart items, join sản phẩm, update/remove/clear cart.
- `src/repositories/contact_repo.rs`: lưu contact message xuống DB.
- `src/repositories/coupon_repo.rs`: validate coupon theo rule + CRUD coupon + tăng used_count.
- `src/repositories/order_repo.rs`: tạo/list/get/update đơn hàng và items, xử lý stock liên quan.
- `src/repositories/product_repo.rs`: truy vấn/CRUD products/categories/variants/images.
- `src/repositories/review_repo.rs`: list/upsert/delete review, kiểm tra điều kiện đã mua.
- `src/repositories/settings_repo.rs`: đọc/ghi `shop_settings` (single/bulk upsert).
- `src/repositories/user_repo.rs`: truy vấn/upsert user (google/email/id), update profile/avatar/login.
- `src/repositories/wishlist_repo.rs`: toggle và đọc wishlist/wishlist IDs.

## 6) Routes
- `src/routes/mod.rs`: router tổng, merge các route module.
- `src/routes/admin.rs`: route admin (auth, dashboard, products, orders, settings, staff, export, notifications).
- `src/routes/cart.rs`: route cart có JWT guard.
- `src/routes/contact.rs`: route contact public.
- `src/routes/coupon.rs`: route validate coupon public.
- `src/routes/order.rs`: route order user có JWT guard.
- `src/routes/product.rs`: route product/category/review (public + protected parts).
- `src/routes/settings.rs`: route public settings.
- `src/routes/user.rs`: route OAuth + profile user.
- `src/routes/wishlist.rs`: route wishlist có JWT guard.

## 7) Services
- `src/services/mod.rs`: module aggregator services.
- `src/services/admin_auth_service.rs`: hash/verify mật khẩu admin, tạo/verify JWT admin, seed admin bootstrap.
- `src/services/auth_service.rs`: OAuth Google flow, trao đổi code/token, upsert user, tạo JWT user.
- `src/services/cart_service.rs`: business rule cart (validate quantity, gọi cart repo).
- `src/services/cloudinary.rs`: upload ảnh lên Cloudinary (ký request, parse response URL).
- `src/services/contact_service.rs`: pipeline xử lý contact (validate, captcha, lưu DB, gửi mail).
- `src/services/coupon_service.rs`: nghiệp vụ coupon cho checkout và admin.
- `src/services/dashboard_service.rs`: tổng hợp KPI dashboard admin.
- `src/services/email_service.rs`: gửi email, verify turnstile, render template mail liên quan contact/order.
- `src/services/export_service.rs`: truy vấn dữ liệu export orders/products theo filter.
- `src/services/notification_service.rs`: logic dữ liệu thông báo admin (vd: pending orders).
- `src/services/order_service.rs`: nghiệp vụ đặt hàng, tính tổng, tạo mã đơn, cập nhật trạng thái.
- `src/services/product_service.rs`: nghiệp vụ sản phẩm cho client/admin.
- `src/services/review_service.rs`: nghiệp vụ review (list/upsert/moderation).
- `src/services/settings_service.rs`: đọc/ghi settings, phân tách public/admin settings.
- `src/services/staff_service.rs`: nghiệp vụ quản lý staff/admin và phân quyền.
- `src/services/user_service.rs`: profile user, callback xử lý auth, upload avatar.
- `src/services/wishlist_service.rs`: nghiệp vụ wishlist ở mức service.

## 8) Tests
- `src/tests/mod.rs`: module test aggregator.
- `src/tests/admin_auth_test.rs`: test hash/verify password admin và JWT admin.

---

## Gợi ý duy trì ghi chú nhất quán
- Mỗi file mới nên có phần “Mục đích file” ở đầu file (2-4 dòng).
- Hàm public nên có doc comment ngắn nêu input/output/side effects.
- Khi refactor logic lớn, cập nhật lại note trong file tương ứng.
