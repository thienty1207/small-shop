# Task Plan — Fix filter sản phẩm theo danh mục/brand

Ngày: 2026-04-07

## Mục tiêu
- Sidebar filter hiển thị đủ danh mục (kể cả danh mục chưa có sản phẩm).
- Không phân mảnh thương hiệu thành nhiều biến thể chữ hoa/thường.

## Việc thực hiện
1. Mở rộng API `/api/products/filters` trả thêm danh sách danh mục + count (LEFT JOIN để vẫn có count = 0).
2. Cập nhật frontend hook nhận `categories` từ filter API.
3. Render section `Danh mục` trên trang products, chọn 1 category bằng query `category`.
4. Giữ section `Thương hiệu` tách biệt, không dùng tên sản phẩm làm filter.
5. Build/check backend + frontend.

## Acceptance
- Sidebar có đủ số danh mục như admin quản lý.
- Danh mục không có sản phẩm vẫn hiện (count 0).
- Brand không còn vỡ thành nhiều item do khác format cơ bản.
