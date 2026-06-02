# Sweet Premium Store

Nền tảng thương mại điện tử **sản phẩm số** dành cho thị trường Việt Nam — bán tài khoản premium (Netflix, Spotify...), dịch vụ tăng tương tác mạng xã hội (SMM), nạp thẻ, gift card. Toàn bộ backend được viết bằng **Node.js + TypeScript**, giao diện theo hệ thống thiết kế **Minimal v4**.

> Dự án được chuyển đổi hoàn chỉnh từ một codebase Python (FastAPI) sang Node.js/TypeScript, đồng thời chuẩn hóa lại kiến trúc, đồng bộ API client–server và bổ sung nhiều tính năng vận hành.

---

## Tính năng chính

**Bán hàng & sản phẩm**
- Danh mục, sản phẩm nhiều gói (package), kho hàng tự động giao (auto-delivery) hoặc giao tay
- Giỏ hàng, mua ngay (đi thẳng tới bước thanh toán), mã giảm giá, flash sale
- Đánh giá sản phẩm, wishlist, tìm kiếm

**Thanh toán & số dư**
- Cổng thanh toán **SePay** (VietQR, webhook xác nhận tự động)
- Ví số dư nội bộ: nạp tiền qua QR, mua bằng số dư, hoàn tiền tự động
- **Nạp thẻ cào** đổi số dư, lịch sử giao dịch

**Dịch vụ SMM**
- Catalog dịch vụ theo nền tảng (Facebook/Instagram/TikTok/YouTube)
- Đặt đơn trừ số dư, tính VAT, hỗ trợ nhiều loại dịch vụ (Custom Comments, Hashtag, SEO...)
- Tích hợp API nhà cung cấp (giao thức SMM panel v2), refill, bảo hành
- **Tự động xử lý đơn đặt lịch & đơn lặp lại** (scheduler)

**Affiliate & marketing**
- Chương trình affiliate: mã giới thiệu, hoa hồng, duyệt rút tiền
- Blog (bài viết + danh mục), trang hỗ trợ, ticket hỗ trợ
- Banner, thông báo hệ thống, gift code

**Quản trị & vận hành**
- Dashboard thống kê, quản lý đơn/user/sản phẩm/số dư
- **Hệ thống mail theo domain** (tự host): chế độ relay hoặc gửi trực tiếp có ký DKIM, sinh khóa DKIM + hướng dẫn DNS tự động
- **Bot Telegram đa kênh**: nhiều bot phân theo bộ phận (Sale/Kỹ thuật/Kế toán), mỗi bot chọn loại thông báo nhận; thông báo realtime (đơn mới, thanh toán, user mới, rút tiền, nạp thẻ, đơn SMM, cảnh báo hết hàng, hoa hồng, lỗi); báo cáo định kỳ + lệnh quản trị nhanh (`/stats`, `/today`, `/top`, `/ranking`...)
- Đăng nhập OAuth Google + tài khoản local, xác thực 2 bước (2FA TOTP), quên/đặt lại mật khẩu qua email
- Phân quyền admin/staff, giới hạn tần suất (rate limit)

---

## Công nghệ sử dụng

### Backend
| Thành phần | Công nghệ |
|------------|-----------|
| Ngôn ngữ | TypeScript (Node.js 20) |
| Web framework | Express |
| ORM / Database | Prisma — hỗ trợ PostgreSQL, MySQL, Supabase (đổi qua `.env`) |
| Xác thực | JWT (jsonwebtoken) + bcryptjs |
| 2FA | otplib (TOTP) + qrcode |
| Email | nodemailer (relay + direct SMTP, ký DKIM) |
| HTTP client | axios |
| Bảo mật | helmet, cors, express-rate-limit |
| Tiện ích | zod, slugify, uuid, sharp (xử lý ảnh), multer (upload), compression |

### Frontend
- **Vanilla JavaScript** (SPA tự xây, không framework) — giữ nhẹ, tải nhanh
- Hệ thống thiết kế **Minimal v4**: font *Public Sans*, palette xanh `#00AB55`, thang shadow MUI elevation, bo góc 16/8px, đồng bộ toàn bộ client + admin

### Triển khai
- **PM2** (process manager, auto-restart)
- **Nginx** (reverse proxy + SSL)
- **Let's Encrypt / Certbot** (HTTPS miễn phí)

---

## Kiến trúc thư mục

```
yourai-ts/
├── src/
│   ├── server.ts            # Điểm vào Express, mount router, khởi động scheduler
│   ├── db.ts                # Prisma client (singleton)
│   ├── middleware/
│   │   ├── auth.ts          # JWT: requireUser / requireAdmin / requireStaffOrAdmin
│   │   └── rateLimit.ts     # Giới hạn tần suất
│   ├── routes/              # 16 nhóm route, ~193 endpoint
│   │   ├── auth.ts          # Đăng ký/đăng nhập, OAuth Google, 2FA, reset mật khẩu
│   │   ├── products.ts      # Sản phẩm + gói
│   │   ├── orders.ts        # Đơn hàng, giao hàng, hủy
│   │   ├── payment.ts       # SePay (tạo link, webhook, cấu hình)
│   │   ├── balance.ts       # Ví số dư, nạp tiền, rút hoa hồng
│   │   ├── smm.ts           # SMM panel (catalog, đặt đơn, refill, admin)
│   │   ├── admin.ts         # Danh mục, banner, gift code, flash sale, cấu hình, stats
│   │   ├── misc.ts          # Blog, đánh giá, wishlist, support, tìm kiếm
│   │   ├── affiliate.ts     # Chương trình affiliate
│   │   ├── integrations.ts  # API providers + AI generate nội dung
│   │   ├── cardCharge.ts    # Nạp thẻ cào
│   │   ├── stock.ts         # Quản lý kho auto-delivery
│   │   ├── telegram.ts      # Bot Telegram đa kênh
│   │   ├── mail.ts          # Cấu hình mail server theo domain
│   │   ├── notifications.ts # Email SMTP
│   │   └── oauth.ts         # Cấu hình OAuth provider
│   ├── services/            # Nghiệp vụ tái sử dụng
│   │   ├── orders.ts        # money(), genOrderCode(), autoDeliver(), coupon, refund
│   │   ├── sepay.ts         # Cổng thanh toán SePay (VietQR, verify webhook)
│   │   ├── providers.ts     # Adapter API nhà cung cấp (SMM panel v2)
│   │   ├── telegram.ts      # Gửi thông báo đa bot, báo cáo, xử lý lệnh
│   │   ├── mail.ts          # Gửi mail relay/direct + DKIM + hướng dẫn DNS
│   │   ├── ai.ts            # Gọi AI provider (Groq/Gemini/OpenAI/GLM)
│   │   └── scheduler.ts     # Báo cáo định kỳ + xử lý đơn SMM lịch/lặp
│   ├── utils/seed.ts        # Khởi tạo dữ liệu ban đầu
│   └── types/index.ts       # Định nghĩa type dùng chung
├── prisma/schema.prisma     # 34 models
├── static/                  # Frontend vanilla JS (14 file) + Minimal theme
├── deploy/nginx.conf.example
├── deploy.sh                # Script triển khai tự động
├── ecosystem.config.js      # Cấu hình PM2
├── DEPLOY.md                # Hướng dẫn deploy VPS chi tiết (cho người mới)
└── .env.example
```

---

## Cài đặt nhanh (local)

Yêu cầu: Node.js 18+, PostgreSQL 13+

```bash
npm install
cp .env.example .env          # điền DATABASE_URL, JWT_SECRET...
npx prisma generate           # sinh Prisma client
npx prisma db push            # tạo bảng
npm run db:seed               # khởi tạo admin + dữ liệu mẫu
npm run dev                   # chạy chế độ dev (tsx watch)
```

Build & chạy production:

```bash
npm run build && npm start
```

### Hỗ trợ nhiều database (SQL)

Dự án chạy được trên **PostgreSQL, MySQL, Supabase** (Supabase = PostgreSQL). Đổi nhanh:

```bash
npm run db:switch postgresql   # hoặc: mysql
# rồi cập nhật DATABASE_URL trong .env (xem mẫu trong .env.example)
npx prisma generate && npx prisma db push
```

Các kiểu dữ liệu trong schema (`@db.VarChar`, `@db.Decimal`, `Json`) tương thích cả hai họ SQL. (MongoDB cần schema riêng do là NoSQL — chưa bao gồm.)

### Tài khoản admin mặc định (sau khi seed)
- Email: `admin@sweetstore.vn`
- Mật khẩu: `Admin@123456` — **đổi ngay sau lần đăng nhập đầu tiên**

---

## Triển khai lên VPS

Xem hướng dẫn chi tiết từng bước (dành cho người mới) trong **[DEPLOY.md](DEPLOY.md)**: trỏ domain → cài Node/PostgreSQL/Nginx/PM2 → cấu hình `.env` → chạy `bash deploy.sh` → bật HTTPS.

---

## Cấu hình sau khi chạy

Mọi cấu hình tích hợp đều thực hiện trong trang **Admin** (không cần sửa code):

- **SePay**: dán API key + số TK + mã ngân hàng, copy link webhook (kèm hướng dẫn 6 bước)
- **Mail theo domain**: chọn relay/direct, tạo khóa DKIM, xem bản ghi DNS cần thêm
- **Telegram**: thêm bot theo bộ phận, chọn loại thông báo, đăng ký webhook
- **OAuth, AI, nhà cung cấp API**: cấu hình trực tiếp trong admin

Tất cả mục có webhook/callback đều hiển thị sẵn URL + nút copy + hướng dẫn.

---

## Ghi chú kỹ thuật

- Frontend gọi API qua hàm `apiFetch` (tự thêm tiền tố `/api`, chuyển `DELETE` → `POST {path}/delete`; server có middleware tự rewrite lại).
- Backend build sạch (`tsc` không lỗi); API client–server đã đồng bộ hoàn toàn (0 endpoint lệch).
- Sau khi đổi `prisma/schema.prisma`, nhớ chạy lại `npx prisma generate && npx prisma db push`.
