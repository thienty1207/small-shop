# Task Plan — Backfill brand cho sản phẩm hiện có

Ngày: 2026-04-07
Mục tiêu: Không cần mở/sửa từng sản phẩm để hiện đúng theo filter thương hiệu ngoài storefront.

## Bối cảnh
- Filter `Thương hiệu` đang dựa vào `products.brand`.
- Một số sản phẩm cũ có `brand` rỗng dù đã chọn `category`.
- Đã có fix UI admin để tự điền brand từ category cho dữ liệu mới/chỉnh sửa.

## Việc cần làm
1. Tạo migration SQL để backfill `products.brand` cho bản ghi đang rỗng, lấy từ `categories.name` (fallback `categories.slug`).
2. Chuẩn hoá chuỗi brand rỗng thành `NULL` trước khi backfill.
3. Bỏ các prefix gây nhiễu như `Danh mục`, `Category`, `Thương hiệu`, `Brand` khi suy ra brand từ category.
4. Chạy migration để áp dụng ngay cho DB hiện tại.
5. Verify nhanh: số lượng sản phẩm `brand` rỗng sau migration = 0 (hoặc chỉ còn bản ghi không thể suy ra).

## Acceptance Criteria
- Không cần click tay ~20 sản phẩm để sửa `brand`.
- Sản phẩm cũ thuộc nhóm Creed hiển thị đúng khi lọc `Thương hiệu = Creed`.
- Dữ liệu mới vẫn được bảo vệ bởi logic autofill trong admin.
