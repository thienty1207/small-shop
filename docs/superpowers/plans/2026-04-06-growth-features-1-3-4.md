# Growth Features Plan (1-3-4)

Ngày: 2026-04-06
Phạm vi: chốt task cho feature 1, 3, 4; implement ngay feature 1.

---

## Feature 1 — Blog-to-Product block (implement now)

### Mục tiêu
- Cho phép mỗi bài blog gắn danh sách sản phẩm nổi bật.
- Hiển thị block sản phẩm trong trang chi tiết blog với CTA đi tới trang sản phẩm.

### Task breakdown
1. DB + API schema
   - Thêm cột `blog_posts.featured_product_slugs TEXT[]`.
   - Trả field này ở public/admin blog payload.
2. Backend business validation
   - Normalize danh sách slug (trim, dedupe, giới hạn số lượng).
   - Validate slug tồn tại sản phẩm trước khi lưu.
3. Admin blog UI
   - Cho nhập danh sách slug sản phẩm nổi bật.
   - Gửi payload `featured_product_slugs` khi tạo/cập nhật bài.
4. Client blog detail UI
   - Đọc `featured_product_slugs` từ blog API.
   - Fetch sản phẩm theo slug và render block “Sản phẩm trong bài viết”.
5. Verification
   - `cargo check` backend.
   - `bun run build` frontend.

### Acceptance criteria
- Admin lưu được bài viết kèm danh sách slug sản phẩm hợp lệ.
- Blog detail hiển thị đúng sản phẩm đã gắn.
- Dữ liệu cũ không có field vẫn chạy ổn (mặc định mảng rỗng).

---

## Feature 3 — Loyalty + Referral (plan only)

### Mục tiêu
- Tăng repeat purchase và referral acquisition.

### Task backlog
1. Data model
   - `loyalty_accounts`, `loyalty_ledger`, `referral_codes`, `referral_events`.
2. Rule engine
   - Earn points theo đơn delivered.
   - Redeem points ở checkout (cap theo %) + expiry policy.
3. Referral flow
   - User có mã giới thiệu riêng.
   - Thưởng 2 chiều (referrer + referee) theo rule chống abuse.
4. Admin controls
   - Bật/tắt rule, cấu hình tỷ lệ quy đổi, xem ledger/audit.
5. Risk guard
   - Chặn self-referral, chặn multiple accounts basic signals.
6. Rollout
   - Bật feature flag theo nhóm user trước khi mở toàn bộ.

---

## Feature 4 — Unified Search + Personalization (plan only)

### Mục tiêu
- Search thống nhất product + blog và cải thiện CTR/conversion bằng gợi ý.

### Task backlog
1. Unified search API
   - Endpoint trả grouped results: products, posts, suggestions.
2. Ranking
   - Exact > prefix > fuzzy, có weight cho recency/popularity.
3. Tracking
   - Log query, click, add-to-cart-from-search, read-from-search.
4. Personalization v1
   - Rule-based recommendations từ hành vi gần đây (view/product/tag).
5. Frontend UX
   - Search dropdown có tab/section cho product + blog.
6. Observability
   - Dashboard CTR search, zero-result rate, conversion from search.

---

## Thứ tự thực thi đề xuất
1. Implement Feature 1 ngay (đang làm).
2. Sau đó implement Feature 4 (search/personalization nền tảng).
3. Implement Feature 3 khi checkout funnel ổn định (để tối ưu ROI).
