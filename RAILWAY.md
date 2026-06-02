# 🚂 Hướng dẫn Deploy Railway — Cấu hình DB & Secrets

Hướng dẫn deploy thử dự án lên **Railway** để test trước khi lên VPS. Đã có sẵn
`railway.json`, `nixpacks.toml`, script `start:railway`.

> Dự án dùng `prisma db push` (chưa có migrations) — phù hợp môi trường **test**.
> Lên production thật nên chuyển sang `prisma migrate deploy` (xem mục cuối).

---

## 1. Tạo project trên Railway

1. Vào https://railway.app → đăng nhập bằng GitHub.
2. **New Project** → **Deploy from GitHub repo** → chọn repo `thanhtinz/Digital-store`,
   branch `main`.
3. Railway tự nhận diện Node (Nixpacks) và bắt đầu build theo `railway.json`:
   - Install: `npm install` → `postinstall` chạy `prisma generate`
   - Build: `npm run build` (tsc → `dist/`)
   - Start: `npm run start:railway` (`prisma db push` tạo bảng → `node dist/server.js`)

---

## 2. Cấu hình DATABASE (PostgreSQL)

### 2.1 Thêm Postgres
Trong project → **+ New** → **Database** → **Add PostgreSQL**.
Railway tạo service Postgres kèm sẵn các biến: `DATABASE_URL`, `PGHOST`, `PGUSER`,
`PGPASSWORD`, `PGDATABASE`, `PGPORT`.

### 2.2 Gắn `DATABASE_URL` cho service web
Mở **service web (app)** → tab **Variables** → **+ New Variable** →
**Add Reference** → chọn `DATABASE_URL` của service **Postgres**.

> Nên dùng **biến tham chiếu** (reference) thay vì copy chuỗi, để Railway dùng
> đường nối nội bộ (`*.railway.internal`) nhanh & an toàn hơn.

### 2.3 Tạo bảng
Tự động khi start (`prisma db push` trong `start:railway`). Không cần thao tác tay.

Schema: PostgreSQL (`prisma/schema.prisma`, provider `postgresql`).

### 2.4 (Thay thế) Dùng PostgreSQL BÊN THỨ 3 — khi Railway không cho thêm DB

App chỉ cần biến **`DATABASE_URL`** trỏ tới một PostgreSQL bất kỳ. Khỏi cần DB của Railway.

**Khuyến nghị: Neon (neon.tech) — miễn phí, không cần thẻ, tạo trong 1 phút.**

1. Vào https://neon.tech → đăng nhập (GitHub) → **Create project**
   (chọn region gần Railway, vd US East / EU).
2. Neon hiện sẵn **Connection string**, dạng:
   ```
   postgresql://USER:PASSWORD@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   → bấm **Copy** (dùng chuỗi mặc định/ "direct", KHÔNG cần bản "pooled" cho app này).
3. Sang **Railway → service web → Variables** → thêm biến:
   - Tên: `DATABASE_URL`
   - Giá trị: dán nguyên chuỗi vừa copy (giữ cả `?sslmode=require`).
4. **Redeploy**. Launcher tự chạy `prisma db push` → tạo bảng trên Neon.

> Tùy chọn khác tương tự: **Supabase** (Project Settings → Database → Connection string,
> chọn URI; nhớ thêm `?sslmode=require`), **Aiven**, **ElephantSQL**...
> Bất kỳ Postgres nào có connection string đều dùng được.

> ⚠️ Lưu ý SSL: DB ngoài thường bắt buộc SSL → chuỗi phải có `?sslmode=require`
> (Neon/Supabase đã có sẵn). Nếu provider khác báo lỗi SSL, thêm `?sslmode=require`
> vào cuối `DATABASE_URL`.


---

## 3. SECRETS / Biến môi trường

Đặt tại: **service web → tab Variables**.

### 3.1 BẮT BUỘC

| Biến | Ví dụ | Mô tả |
|------|-------|-------|
| `NODE_ENV` | `production` | Bật chế độ production |
| `JWT_SECRET` | `1a2b3c...` (**≥ 16 ký tự**) | Khóa ký JWT. **Thiếu/ngắn → app KHÔNG khởi động** |
| `APP_BASE_URL` | `https://your-app.up.railway.app` | URL public (dùng cho CORS/SEO/QR/redirect OAuth) |
| `DATABASE_URL` | *(reference từ Postgres)* | Kết nối DB |

`PORT` **không cần đặt** — Railway tự cấp, app tự đọc `process.env.PORT`.

Tạo nhanh secret an toàn:
```bash
openssl rand -hex 24        # JWT_SECRET (48 ký tự hex)
openssl rand -hex 24        # ADMIN_SECRET (nếu dùng)
```

### 3.2 TÀI KHOẢN ADMIN HẠT GIỐNG (tùy chọn)

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `SEED_ADMIN_EMAIL` | `admin@sweetstore.vn` | Email admin khi chạy seed |
| `SEED_ADMIN_PASSWORD` | `Admin@123456` | Mật khẩu admin khi seed (**nên đổi**) |
| `ADMIN_SECRET` | *(trống)* | Khóa ≥16 ký tự để tạo admin qua API `/auth/...`. Không đặt thì chỉ tạo admin bằng seed |

### 3.3 CỔNG THANH TOÁN SePay (tùy chọn)

> Có thể bỏ trống ở đây và **cấu hình trong Admin → Thanh toán** sau. Nếu đặt bằng
> env thì env **override** giá trị trong Admin.

| Biến | Mô tả |
|------|-------|
| `SEPAY_API_KEY` | API key SePay |
| `SEPAY_ACCOUNT_NUMBER` | Số tài khoản nhận tiền |
| `SEPAY_BANK_CODE` | Mã ngân hàng (VD: `MB`, `VCB`, `970422`) |
| `SEPAY_WEBHOOK_SECRET` | Secret xác thực webhook (bắt buộc nếu test thanh toán) |

Webhook URL khai báo bên SePay: `https://your-app.up.railway.app/api/payment/webhook/sepay`

### 3.4 EMAIL / SMTP (tùy chọn)

> Cũng có thể cấu hình trong **Admin → Kết nối & Thông báo → Email**.

| Biến | Mô tả |
|------|-------|
| `MAIL_FROM_EMAIL` | Email gửi đi (no-reply@...) |
| `SMTP_SERVER` | Host SMTP (VD: `smtp.gmail.com`) |
| `SMTP_PORT` | Cổng (VD: `587`) |
| `SMTP_USERNAME` | Tài khoản SMTP |
| `SMTP_PASSWORD` | Mật khẩu / app password |
| `SERVER_IP` | (chỉ dùng cho gợi ý DNS/DKIM trong Admin) |

### 3.5 ĐĂNG NHẬP GOOGLE (OAuth — tùy chọn)

| Biến | Mô tả |
|------|-------|
| `GOOGLE_CLIENT_ID` | Client ID Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Client Secret |
| `GOOGLE_REDIRECT_URI` | `https://your-app.up.railway.app/api/auth/google/callback` |

> Lưu ý: nhiều cấu hình (SePay, Mail, điểm thưởng, thuế, bật/tắt tính năng, bảo trì…)
> lưu trong **DB (bảng siteConfig)** và chỉnh trực tiếp trong **Admin**, không cần env.

---

## 4. Cấp domain công khai

Service web → **Settings** → **Networking** → **Generate Domain**.
Lấy URL (vd `your-app.up.railway.app`) → cập nhật lại biến **`APP_BASE_URL`** cho khớp
→ **Redeploy** (để CORS/redirect đúng).

---

## 5. Tạo dữ liệu mẫu + admin (chạy 1 lần)

**Cách dễ nhất (không cần máy local):**
1. Service web → **Variables** → thêm `RUN_SEED` = `1`.
2. **Redeploy**. Logs sẽ hiện `✅ Seed completed`.
3. **Gỡ biến `RUN_SEED`** (hoặc đặt `0`) → redeploy lại để không seed mỗi lần.

**Hoặc bằng Railway CLI ở máy bạn:**
```bash
npm i -g @railway/cli
railway login
railway link            # chọn project + service web
railway run npm run db:seed
```

Đăng nhập quản trị: `https://your-app.up.railway.app/admin`
(mặc định `admin@sweetstore.vn` / `Admin@123456` — hoặc theo `SEED_ADMIN_*`).

---

## 6. Kiểm tra nhanh

| Kiểm tra | Mong đợi |
|----------|----------|
| `https://your-app.up.railway.app/` | Trang chủ storefront |
| `.../robots.txt` | 200 (healthcheck) |
| `.../admin` | Trang đăng nhập quản trị |
| Logs (Deployments → View Logs) | `✅ Database connected` + `🚀 ... running` |

---

## 7. Khi LÊN PRODUCTION thật (VPS hoặc Railway prod)

- **Đổi `SEED_ADMIN_PASSWORD`** và mật khẩu admin ngay.
- **`JWT_SECRET`** dùng chuỗi ngẫu nhiên mạnh, không commit.
- Chuyển từ `db push` sang **migrations** để an toàn dữ liệu:
  ```bash
  npx prisma migrate dev --name init     # tạo migrations (1 lần, ở local)
  # rồi sửa start thành: prisma migrate deploy && node dist/server.js
  ```
- Bật HTTPS (Railway tự có; VPS dùng nginx + certbot — xem `DEPLOY.md`).
- Rà soát `start:railway` (`--accept-data-loss`) — **không** dùng cờ này ở production.

---

## ⚠️ Ghi chú
- Ảnh upload lưu trong DB (bảng `uploaded_images`) → không mất khi redeploy.
- App tự bind `0.0.0.0:$PORT` nên hợp Railway/Heroku-style.
- Nếu build lỗi prisma: đảm bảo `postinstall: prisma generate` chạy (đã cấu hình sẵn).
