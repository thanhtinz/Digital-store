# 🚂 Deploy thử trên Railway (test trước khi lên VPS)

Bộ file đã chuẩn bị sẵn: `railway.json`, `nixpacks.toml`, và script `start:railway`
(tự `prisma db push` rồi chạy server). Dùng `prisma db push` vì dự án chưa có
migrations — phù hợp cho môi trường test.

## 1. Tạo project + PostgreSQL
1. Vào https://railway.app → **New Project** → **Deploy from GitHub repo** → chọn
   repo này (`thanhtinz/Digital-store`), branch `main`.
2. Trong project, bấm **+ New** → **Database** → **Add PostgreSQL**.
   Railway tự tạo biến `DATABASE_URL` cho service Postgres.

## 2. Gắn DATABASE_URL cho service web
Mở service web (app) → tab **Variables** → **Add Reference** → chọn
`DATABASE_URL` từ service Postgres (hoặc copy `DATABASE_URL` của Postgres dán vào).

## 3. Đặt biến môi trường (Variables) cho service web
Bắt buộc:

| Biến | Giá trị | Ghi chú |
|------|---------|---------|
| `NODE_ENV` | `production` | |
| `JWT_SECRET` | chuỗi ngẫu nhiên ≥ 16 ký tự | **bắt buộc**, thiếu là app không chạy |
| `APP_BASE_URL` | `https://<tên-app>.up.railway.app` | URL public Railway cấp (điền sau khi có domain) |
| `DATABASE_URL` | (reference từ Postgres) | |

Tuỳ chọn (điền sau cũng được — có thể cấu hình trong Admin):
`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEPAY_*`, `SMTP_*`, `GOOGLE_*`.

> Tạo nhanh JWT_SECRET: `openssl rand -hex 24`

## 4. Cấp domain
Service web → **Settings** → **Networking** → **Generate Domain**.
Lấy URL rồi cập nhật lại biến `APP_BASE_URL` cho khớp, rồi **Redeploy**.

## 5. Build & chạy (tự động)
Railway dùng Nixpacks:
- **Install**: `npm install` → chạy `postinstall` = `prisma generate`
- **Build**: `npm run build` (tsc → `dist/`)
- **Start**: `npm run start:railway` = `prisma db push` (tạo bảng) → `node dist/server.js`
- **Healthcheck**: `GET /robots.txt`

## 6. Tạo dữ liệu mẫu + tài khoản admin (chạy 1 lần)
Sau khi deploy thành công, mở **Shell** của service (hoặc dùng Railway CLI) và chạy:

```bash
npm run db:seed
```

Hoặc bằng Railway CLI ở máy bạn:
```bash
npm i -g @railway/cli
railway login
railway link        # chọn project
railway run npm run db:seed
```

Tài khoản admin mặc định (đổi qua biến `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`):
- Email: `admin@sweetstore.vn`
- Mật khẩu: `Admin@123456`

Đăng nhập quản trị tại: `https://<app>.up.railway.app/admin`

## ⚠️ Lưu ý
- `start:railway` dùng `prisma db push --accept-data-loss`: tiện cho **test** nhưng
  có thể xoá cột khi đổi schema. Khi lên VPS/production thật nên chuyển sang
  **migrations** (`prisma migrate deploy`).
- File lưu ảnh upload nằm trong **DB** (bảng `uploaded_images`) nên không lo mất khi
  redeploy. Ảnh tham chiếu qua URL ngoài thì tuỳ nguồn.
- Webhook SePay (nếu test thanh toán): trỏ về `https://<app>.up.railway.app/api/payment/webhook/sepay`
  và đặt `sepay_webhook_secret` trong Admin → Thanh toán.
