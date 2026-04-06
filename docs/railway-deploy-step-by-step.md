# Railway Deploy Step-by-Step

Huong dan nay dung cho repo `small-shop` hien tai, voi:

- `backend/`: Rust + Axum
- `frontend/`: React + Vite
- `Postgres`: chay tren Railway
- media production: Cloudinary

Muc tieu la deploy theo 2 service:

- `backend`
- `frontend`

## B1. Truy cap Railway

1. Mo [https://railway.app](https://railway.app)
2. Dang nhap bang GitHub
3. Chon `New Project`

## B2. Tao project moi

1. Chon `Deploy from GitHub repo`
2. Chon repo `small-shop`
3. Doi Railway import repo xong

Sau buoc nay, ban se tao rieng tung service ben trong cung mot project.

## B3. Tao database Postgres

1. Trong project, bam `New`
2. Chon `Database`
3. Chon `Add PostgreSQL`
4. Railway se tao cho ban 1 service database

Sau khi tao xong:

1. Mo service Postgres
2. Vao tab `Variables`
3. Ghi nho bien `DATABASE_URL`

Ban se dung bien nay cho service `backend`.

## B4. Tao service backend

1. Trong project, bam `New`
2. Chon `GitHub Repo`
3. Chon lai repo `small-shop`
4. Dat ten service la `backend`
5. Dat `Root Directory` la:

```text
backend
```

## B5. Cau hinh deploy cho backend

Trong service `backend`, mo `Settings` va dien:

`Start Command`

```bash
cargo run --release --bin backend
```

`Pre-Deploy Command`

```bash
cargo run --release --bin migrate
```

`Healthcheck Path`

```text
/healthz
```

## B6. Them environment variables cho backend

Mo tab `Variables` cua service `backend` va tao cac bien sau.

Gia tri copy-paste mau:

```env
APP_ENV=production
AUTO_RUN_MIGRATIONS=false
UPLOAD_BACKEND=cloudinary

SERVER_PORT=${{PORT}}
DATABASE_URL=<dan DATABASE_URL tu Railway Postgres vao day>

FRONTEND_URL=https://<frontend-domain-se-dung-sau>

CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>

GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
GOOGLE_REDIRECT_URI=https://<backend-domain>/auth/google/callback

JWT_SECRET=<chuoi-bi-mat-toi-thieu-32-ky-tu>
JWT_EXPIRATION_HOURS=24
CSRF_COOKIE_KEY=<chuoi-bi-mat-toi-thieu-32-ky-tu>

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=<smtp-username>
SMTP_PASSWORD=<smtp-password>
CONTACT_FROM_NAME=Rusty Perfume
CONTACT_FROM_EMAIL=<from-email>
CONTACT_ADMIN_EMAIL=<admin-email>
REPLY_LOGO_URL=

CLOUDFLARE_SECRET_KEY=<turnstile-secret>

ADMIN_USERNAME=<admin-username>
ADMIN_PASSWORD=<admin-password>
```

Luu y:

- `FRONTEND_URL` tam thoi co the de placeholder, sau khi frontend co domain thi quay lai sua.
- `GOOGLE_REDIRECT_URI` phai trung domain backend thuc te sau khi deploy.
- `DATABASE_URL` phai dan tu service Postgres cua Railway.
- `UPLOAD_BACKEND=cloudinary` la bat buoc cho production theo setup hien tai.

## B7. Deploy backend lan dau

1. Bam `Deploy`
2. Doi Railway build xong
3. Kiem tra `Deploy Logs`

Neu thanh cong:

1. Vao `Settings`
2. Mo `Networking`
3. Tao hoac copy domain public cua backend

Vi du:

```text
https://rusty-backend.up.railway.app
```

## B8. Kiem tra backend co song khong

Mo trinh duyet va truy cap:

```text
https://<backend-domain>/healthz
```

Neu dung, no se tra:

```json
{"status":"ok"}
```

Neu khong len:

1. Xem `Deploy Logs`
2. Kiem tra lai `DATABASE_URL`
3. Kiem tra lai `CLOUDINARY_URL`
4. Kiem tra `Pre-Deploy Command` co chay migration thanh cong khong

## B9. Tao service frontend

1. Trong cung project, bam `New`
2. Chon `GitHub Repo`
3. Chon repo `small-shop`
4. Dat ten service la `frontend`
5. Dat `Root Directory` la:

```text
frontend
```

## B10. Cau hinh deploy cho frontend

Trong service `frontend`, mo `Settings` va dien:

`Build Command`

```bash
bun run build
```

`Start Command`

```bash
npx serve -s dist -l $PORT
```

## B11. Them environment variables cho frontend

Mo tab `Variables` cua service `frontend` va tao:

```env
VITE_API_URL=https://<backend-domain>
```

Vi du:

```env
VITE_API_URL=https://rusty-backend.up.railway.app
```

## B12. Deploy frontend

1. Bam `Deploy`
2. Doi build xong
3. Mo `Networking`
4. Copy domain public cua frontend

Vi du:

```text
https://rusty-frontend.up.railway.app
```

## B13. Quay lai sua backend sau khi frontend co domain

Bay gio quay lai service `backend`, sua lai:

```env
FRONTEND_URL=https://<frontend-domain-that>
GOOGLE_REDIRECT_URI=https://<backend-domain>/auth/google/callback
```

Sau do redeploy backend.

## B14. Cau hinh Google OAuth

Mo Google Cloud Console va sua OAuth callback:

`Authorized redirect URI`

```text
https://<backend-domain>/auth/google/callback
```

Neu frontend dung domain moi, phan backend van la noi nhan callback OAuth.

## B15. Kiem tra he thong sau deploy

Kiem tra theo thu tu:

1. `https://<backend-domain>/healthz`
2. `https://<frontend-domain>`
3. vao trang blog
4. vao trang san pham
5. login bang Google
6. mo trang admin
7. upload anh bai viet hoac san pham

## B16. Cac loi de gap nhat

### Frontend mo duoc, nhung API fail

Thuong do:

- `VITE_API_URL` sai
- backend chua co domain public
- backend dang fail healthcheck

### Backend deploy fail ngay luc start

Thuong do:

- thieu env bat buoc
- `DATABASE_URL` sai
- `CLOUDINARY_URL` sai
- `GOOGLE_CLIENT_SECRET` hoac `JWT_SECRET` chua set

### Migration fail

Thuong do:

- `DATABASE_URL` khong dung
- database user khong du quyen
- schema cu bi lech

### Login Google fail

Thuong do:

- `GOOGLE_REDIRECT_URI` sai
- Google Console chua cap nhat callback URL
- `FRONTEND_URL` sai nen redirect ve sai noi

### Upload anh fail

Thuong do:

- `UPLOAD_BACKEND=cloudinary` da bat, nhung `CLOUDINARY_URL` sai

## B17. Checklist cuoi cung truoc khi mo public

Backend:

```text
[ ] /healthz tra ve ok
[ ] DATABASE_URL dung
[ ] CLOUDINARY_URL dung
[ ] FRONTEND_URL dung
[ ] Pre-Deploy migrate chay ok
```

Frontend:

```text
[ ] VITE_API_URL trung backend public domain
[ ] mo homepage duoc
[ ] goi API blog/san pham duoc
```

OAuth:

```text
[ ] GOOGLE_REDIRECT_URI dung
[ ] Google Console da them redirect URI
```

## Lenh mau de doi chieu

Backend:

```bash
cargo run --release --bin backend
```

Migration:

```bash
cargo run --release --bin migrate
```

Frontend:

```bash
bun run build
npx serve -s dist -l $PORT
```

## File lien quan trong repo

- `backend/.env.example`
- `backend/src/config.rs`
- `backend/src/main.rs`
- `backend/src/bin/migrate.rs`
- `frontend/vite.config.ts`
- `frontend/src/lib/api-base.ts`

## Ghi chu cuoi

Neu deploy lan dau, hay uu tien cho `backend` len va healthcheck xanh truoc. Sau do moi deploy `frontend`.

Neu ban muon don gian hon nua, buoc tiep theo nen lam la them `railway.toml` va script release/deploy de giam viec nhap tay tren dashboard Railway.
