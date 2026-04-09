# Task Plan — Lint cleanup batch 1

Ngày: 2026-04-07

## Mục tiêu
- Giảm lỗi lint mức `error` để CI/code quality ổn định.
- Ưu tiên sửa lỗi có thể fix an toàn, không đổi logic nghiệp vụ.

## Phạm vi batch 1
1. Sửa lỗi `no-empty-object-type` ở UI/common types.
2. Sửa lỗi `no-extra-boolean-cast` và một số warning dễ fix trong file đã chạm.
3. Sửa lỗi test `no-explicit-any` ở các test checkout/cart.
4. Sửa lỗi import config (`no-require-imports`) trong tailwind config.
5. Chạy lint lại để xác nhận giảm lỗi.

## Nguyên tắc
- Không refactor lớn.
- Không thay đổi behavior runtime.
- Mỗi sửa đổi phải qua build/lint verify.
