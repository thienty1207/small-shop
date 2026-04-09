# Task Plan — Regression hardening sau thay đổi filter + buy-now

Ngày: 2026-04-07

## Mục tiêu
- Loại bỏ lỗi regression ở test suite sau thay đổi nghiệp vụ.
- Giữ hành vi mới: chỉ lọc theo danh mục trên trang products, và mua ngay tách khỏi giỏ.

## Việc cần làm
1. Cập nhật Checkout để không chặn submit trong môi trường test khi thiếu Cloudflare token.
2. Cập nhật test products filters theo logic mới (không còn brand filter).
3. Cập nhật test homepage theo cấu trúc UI hiện tại (đã bỏ các section cũ).
4. Chạy lại test frontend để xác nhận các regression chính đã hết.
