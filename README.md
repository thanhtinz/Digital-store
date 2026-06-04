# Digital Store

Nền tảng thương mại điện tử **sản phẩm số** cho thị trường Việt Nam: bán tài khoản premium (Netflix, Spotify…), **nạp game/topup**, **gift card**, **dịch vụ tăng tương tác mạng xã hội (SMM)** và ví số dư nội bộ.

Hệ thống gồm hai phần trong cùng một repo:

- **Backend** — REST API viết bằng **Express + TypeScript + Prisma**.
- **Frontend** — ứng dụng **Next.js + TypeScript + MUI** (hệ thiết kế *Minimal v4*): trang bán hàng (storefront), khu vực người dùng và **admin dashboard**.

Khi chạy production, cả hai gói chung **một container**: Next.js giữ cổng công khai và proxy `/api`, `/admin`, `/static` về Express nội bộ (same-origin, không cần CORS).

---

## Tính năng chính

**Bán hàng & sản phẩm**
- Danh mục, sản phẩm nhiều gói (package), kho tự động giao (auto-delivery) hoặc giao tay
- Phân loại sản phẩm: premium / topup (game) / gift card với layout chi tiết riêng
- Giỏ hàng, mua ngay, mã giảm giá, flash sale, wishlist, tìm kiếm
- **Đánh giá sản phẩm**: chỉ cho người đã mua, phân bố sao, lọc/sắp xếp/phân trang, ảnh đính kèm, admin phản hồi

**Thanh toán & số dư**
- Cổng thanh toán **SePay** (VietQR, webhook xác nhận tự động)
- Ví số dư nội bộ: nạp qua QR, mua bằng số dư, hoàn tiền tự động
- **Nạp thẻ cào** đổi số dư, lịch sử giao dịch

**Dịch vụ SMM**
- Catalog theo nền tảng (Facebook / Instagram / TikTok / YouTube…)
- Đặt đơn trừ số dư, tính VAT, nhiều loại dịch vụ (Custom Comments, Hashtag, SEO, Subscriptions, Package…)
- Tích hợp API nhà cung cấp (SMM panel v2), refill, bảo hành
- **Tự động xử lý đơn đặt lịch & đơn lặp lại** (scheduler)

**Affiliate & marketing**
- Affiliate: mã giới thiệu, hoa hồng, duyệt rút tiền
- Blog (bài viết + danh mục), trang hỗ trợ, ticket, live chat
- Banner, gift code, điểm thưởng (loyalty), thông báo hệ thống

**Quản trị & vận hành**
- Admin dashboard: thống kê, quản lý đơn / user / sản phẩm / số dư / SMM / cấu hình site
- **Cấu hình site động** (tên web, mô tả, logo, liên hệ, mạng xã hội…) lấy từ backend, không hard-code
- **Mail theo domain** (tự host): relay hoặc gửi trực tiếp có ký DKIM, sinh khóa DKIM + hướng dẫn DNS
- **Bot Telegram đa kênh**: nhiều bot theo bộ phận, thông báo realtime + báo cáo định kỳ + lệnh quản trị nhanh
- Đăng nhập OAuth Google + tài khoản local, 2FA (TOTP), quên/đặt lại mật khẩu qua email
- Phân quyền admin/staff, rate limit

---

## Công nghệ sử dụng

### Backend (`src/`)
| Thành phần | Công nghệ |
|------------|-----------|
| Ngôn ngữ | TypeScript (Node.js 20) |
| Web framework | Express |
| ORM / Database | Prisma — PostgreSQL hoặc MySQL (đổi qua `.env`) |
| Xác thực | JWT (jsonwebtoken) + bcryptjs |
| 2FA | otplib (TOTP) + qrcode |
| Email | nodemailer (relay + direct SMTP, ký DKIM) |
| Ảnh / Upload | sharp, multer |
| Bảo mật | helmet, cors, express-rate-limit |

### Frontend (`frontend/`)
| Thành phần | Công nghệ |
|------------|-----------|
| Framework | Next.js 13 (pages router) + React 18 + TypeScript |
| UI | MUI v5 + hệ thiết kế Minimal v4 (font *Public Sans*, accent `#00AB55`) |
| State | Redux Toolkit |
| Form | react-hook-form + yup |
| Đa ngôn ngữ | i18next (VI/EN/…) |
| HTTP | axios (interceptor adapt dữ liệu backend → component) |

### Triển khai
- **Docker** (multi-stage) + **Railway** (mặc định) — xem `Dockerfile`, `railway.json`, `docker-start.js`
- Hoặc **VPS**: PM2 + Nginx + Let's Encrypt (xem `DEPLOY.md`)

---

## Kiến trúc thư mục

```
Digital-store/
├── src/                       # Backend Express + TypeScript
│   ├── server.ts              # Điểm vào, mount router, khởi động scheduler
│   ├── db.ts                  # Prisma client (singleton)
│   ├── middleware/            # auth (JWT) + rate limit
│   ├── routes/                # 19 nhóm route REST
│   │   ├── auth.ts            # Đăng ký/đăng nhập, OAuth Google, 2FA
│   │   ├── products.ts        # Sản phẩm + gói
│   │   ├── orders.ts          # Đơn hàng, giao hàng, hủy
│   │   ├── payment.ts         # SePay (link, webhook)
│   │   ├── balance.ts         # Ví số dư, nạp, rút hoa hồng
│   │   ├── smm.ts             # SMM panel (catalog, đặt đơn, refill, admin)
│   │   ├── admin.ts           # Danh mục, banner, flash sale, cấu hình site, stats
│   │   ├── misc.ts            # Blog, đánh giá, wishlist, support
│   │   ├── cart.ts            # Giỏ hàng đồng bộ server
│   │   ├── chat.ts            # Live chat
│   │   ├── loyalty.ts         # Điểm thưởng
│   │   ├── affiliate.ts       # Affiliate
│   │   ├── integrations.ts    # API providers + AI sinh nội dung
│   │   ├── cardCharge.ts      # Nạp thẻ cào
│   │   ├── stock.ts           # Kho auto-delivery
│   │   ├── telegram.ts        # Bot Telegram đa kênh
│   │   ├── mail.ts            # Mail server theo domain
│   │   ├── oauth.ts           # Cấu hình OAuth provider
│   │   └── userNotifications.ts
│   ├── services/              # Nghiệp vụ: orders, sepay, providers, telegram, mail, ai, scheduler
│   └── utils/seed.ts          # Khởi tạo dữ liệu ban đầu
│
├── frontend/                  # Next.js + TypeScript + MUI
│   └── src/
│       ├── pages/             # Routes: storefront, /dashboard (user + admin), /auth
│       ├── sections/          # UI theo trang (storefront, admin, @dashboard/e-commerce…)
│       ├── layouts/           # Layout dashboard/storefront
│       ├── hooks/             # vd useSiteSettings (lấy cấu hình site từ /api/settings)
│       ├── redux/             # store + slices
│       ├── components/        # component dùng chung (SiteHead, logo, hook-form…)
│       └── utils/axios.ts     # axios instance + adapter dữ liệu
│
├── prisma/schema.prisma       # 44 models
├── static/                    # Admin SPA legacy (/admin) + ảnh upload/banner
├── scripts/                   # railway-start, db-switch…
├── Dockerfile                 # Build multi-stage (backend + frontend + runner)
├── docker-start.js            # prisma db push → chạy backend + frontend song song
├── railway.json               # Cấu hình Railway (Dockerfile + healthcheck)
├── DEPLOY.md                  # Hướng dẫn deploy VPS chi tiết
└── .env.example
```

> Lưu ý: có **hai giao diện admin** — admin dashboard hiện đại trong Next.js (`frontend/src/pages/dashboard/admin/*`, đang phát triển chính) và một admin SPA legacy phục vụ tại `/admin` từ `static/`.

---

## Chạy ở máy local

Yêu cầu: **Node.js 20+**, **PostgreSQL 13+** (hoặc MySQL).

### 1. Backend (API — cổng 4000/3000)

```bash
npm install
cp .env.example .env          # điền DATABASE_URL, JWT_SECRET…
npx prisma generate
npx prisma db push            # tạo bảng theo schema
npm run db:seed               # tạo admin + dữ liệu mẫu
npm run dev                   # tsx watch src/server.ts
```

### 2. Frontend (Next.js — cổng 8081)

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev                   # next dev -p 8081
```

Frontend proxy `/api`, `/admin`, `/static` sang backend qua `next.config.js`
(`BACKEND_INTERNAL_URL`, mặc định `http://127.0.0.1:4000`). Khi chạy tách, đặt
biến này (hoặc `PORT` backend) cho khớp.

### Đổi loại database (PostgreSQL ↔ MySQL)

```bash
npm run db:switch postgresql   # hoặc: mysql
# cập nhật DATABASE_URL trong .env rồi:
npx prisma generate && npx prisma db push
```

Các kiểu dữ liệu trong schema (`@db.VarChar`, `@db.Decimal`, `Json`) tương thích cả hai họ SQL.

### Tài khoản admin mặc định (sau seed)
- Email: `admin@sweetstore.vn`
- Mật khẩu: `Admin@123456` — **đổi ngay sau lần đăng nhập đầu**
  (cấu hình qua `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

---

## Triển khai

### Docker / Railway (mặc định)
Repo có sẵn `Dockerfile` multi-stage và `railway.json`. Khi deploy, `docker-start.js`:
1. chạy `prisma db push` (đồng bộ schema, **không chặn** server nếu lỗi),
2. khởi động **backend** (Express, `BACKEND_PORT=4000`) và **frontend** (Next.js, `PORT` công khai) song song.

> Vì schema được `db push` tự động lúc khởi động, sau khi sửa `prisma/schema.prisma`
> chỉ cần deploy — không cần migration thủ công.

Healthcheck: `/healthz`. Marker phiên bản frontend: `/build-info.json`.

### VPS thủ công
Xem hướng dẫn từng bước (trỏ domain → cài Node/PostgreSQL/Nginx/PM2 → `.env` → `bash deploy.sh` → HTTPS) trong **[DEPLOY.md](DEPLOY.md)**.

---

## Cấu hình sau khi chạy

Mọi tích hợp cấu hình ngay trong **Admin** (không sửa code):

- **Cấu hình site**: tên web, mô tả, logo, liên hệ, mạng xã hội → áp dụng toàn site (tiêu đề tab, meta, footer, logo)
- **SePay**: API key + số TK + mã ngân hàng, copy link webhook
- **Mail theo domain**: chọn relay/direct, tạo khóa DKIM, xem bản ghi DNS cần thêm
- **Telegram**: thêm bot theo bộ phận, chọn loại thông báo, đăng ký webhook
- **OAuth, AI, nhà cung cấp API SMM**: cấu hình trực tiếp

Mọi mục có webhook/callback đều hiển thị sẵn URL + nút copy + hướng dẫn.

---

## Ghi chú kỹ thuật

- Frontend và backend **same-origin** trong production nhờ Next.js rewrites — không cần CORS.
- `utils/axios.ts` có interceptor adapt dữ liệu backend (snake_case / cấu trúc thật) sang shape mà component MUI cần; adapter **chỉ** áp cho endpoint sản phẩm để không làm hỏng dữ liệu khác.
- Cấu hình site công khai lấy qua hook `useSiteSettings()` → `/api/settings`; `SiteHead` đồng bộ tiêu đề tab + meta description theo cấu hình đó.
- Sau khi đổi `prisma/schema.prisma`: chạy lại `npx prisma generate && npx prisma db push` (local) — production tự `db push` khi khởi động.
- Build sạch: cả backend (`tsc`) và frontend (`next build` / `tsc --noEmit`) không lỗi.
