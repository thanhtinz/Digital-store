# Hướng dẫn Deploy lên VPS (cho người mới bắt đầu)

Tài liệu này hướng dẫn bạn đưa website **Sweet Premium Store** từ máy tính cá nhân (local) lên một máy chủ VPS để chạy thật trên internet, kèm domain và HTTPS. Mỗi bước đều có lệnh cụ thể, copy-paste là chạy được.

---

## Phần 0 — Bạn cần chuẩn bị gì

1. **Một VPS** chạy Ubuntu 22.04 hoặc 24.04 (ví dụ từ Vultr, DigitalOcean, Hetzner, hoặc VPS Việt Nam). Cấu hình tối thiểu: 1 CPU, 2GB RAM.
2. **Một tên miền** (domain) đã mua, ví dụ `shopcuaban.com`.
3. **Phần mềm trên máy local**: một trình terminal (Terminal trên Mac/Linux, hoặc PowerShell/Windows Terminal trên Windows).
4. **Thông tin VPS**: địa chỉ IP, tài khoản `root` và mật khẩu (nhà cung cấp gửi qua email khi tạo VPS).

---

## Phần 1 — Trỏ domain về VPS

Vào trang quản lý domain (nơi bạn mua tên miền), tạo 2 bản ghi DNS dạng A:

| Loại | Tên (Host) | Giá trị (trỏ tới) |
|------|------------|-------------------|
| A    | `@`        | IP của VPS        |
| A    | `www`      | IP của VPS        |

Đợi 5–30 phút để DNS cập nhật. Kiểm tra bằng cách mở terminal local và gõ (thay domain của bạn):

```bash
ping shopcuaban.com
```

Nếu thấy IP của VPS hiện ra là đã trỏ đúng.

---

## Phần 2 — Kết nối vào VPS

Trên máy local, mở terminal và gõ (thay IP thật):

```bash
ssh root@123.45.67.89
```

Lần đầu nó hỏi `yes/no` thì gõ `yes`, rồi nhập mật khẩu. Khi thấy dấu nhắc đổi thành `root@...` là bạn đã vào trong VPS.

> Từ đây trở đi, mọi lệnh đều gõ **bên trong VPS** (qua cửa sổ SSH này), trừ khi ghi rõ là "trên máy local".

---

## Phần 3 — Cài đặt phần mềm nền trên VPS

Copy-paste từng khối lệnh dưới đây vào VPS.

### 3.1. Cập nhật hệ thống

```bash
apt update && apt upgrade -y
```

### 3.2. Cài Node.js 20 (LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # kiểm tra: phải ra v20.x
```

### 3.3. Cài PostgreSQL (database)

```bash
apt install -y postgresql postgresql-contrib
systemctl enable --now postgresql
```

Tạo database và user cho app:

```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE sweetstore;
CREATE USER sweetuser WITH ENCRYPTED PASSWORD 'doi_mat_khau_nay';
GRANT ALL PRIVILEGES ON DATABASE sweetstore TO sweetuser;
ALTER DATABASE sweetstore OWNER TO sweetuser;
SQL
```

> **Đổi `doi_mat_khau_nay`** thành mật khẩu mạnh của bạn và ghi nhớ — sẽ dùng ở bước cấu hình `.env`.

### 3.4. Cài Nginx (web server) và Certbot (SSL miễn phí)

```bash
apt install -y nginx certbot python3-certbot-nginx
systemctl enable --now nginx
```

### 3.5. Cài PM2 (giữ app chạy 24/7)

```bash
npm install -g pm2
```

### 3.6. Mở tường lửa (nếu bật)

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

---

## Phần 4 — Đưa code lên VPS

Có 2 cách, chọn **một**.

### Cách A — Dùng Git (khuyên dùng)

Trên VPS:

```bash
cd /var/www
git clone https://github.com/tai-khoan-cua-ban/sweet-store.git
cd sweet-store
```

### Cách B — Upload thủ công từ máy local

Trên **máy local**, nén thư mục dự án rồi đẩy lên (thay IP):

```bash
# (chạy trên máy local, trong thư mục chứa yourai-ts)
scp -r yourai-ts root@123.45.67.89:/var/www/sweet-store
```

Sau đó vào VPS:

```bash
cd /var/www/sweet-store
```

---

## Phần 5 — Cấu hình biến môi trường (.env)

Trong thư mục dự án trên VPS:

```bash
cp .env.example .env
nano .env
```

Sửa các dòng quan trọng (dùng phím mũi tên di chuyển, sửa xong nhấn `Ctrl+O` rồi `Enter` để lưu, `Ctrl+X` để thoát):

```ini
# Chuỗi kết nối DB — khớp với user/password/database đã tạo ở bước 3.3
DATABASE_URL="postgresql://sweetuser:doi_mat_khau_nay@localhost:5432/sweetstore"

# Khóa bí mật JWT — đặt một chuỗi ngẫu nhiên dài (xem mẹo bên dưới)
JWT_SECRET="..."

# Khóa tạo admin — chuỗi bí mật bất kỳ
ADMIN_SECRET="..."

# Domain thật của bạn (có https)
APP_BASE_URL="https://shopcuaban.com"

# IP của VPS (dùng cho hướng dẫn mail DNS)
SERVER_IP="123.45.67.89"
```

> **Mẹo tạo chuỗi ngẫu nhiên** cho `JWT_SECRET` / `ADMIN_SECRET`, chạy trên VPS:
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```
> Copy kết quả dán vào.

Các phần SePay, Telegram, Mail bạn **không cần** điền ở đây — sẽ cấu hình trong trang Admin sau khi web chạy.

---

## Phần 6 — Triển khai bằng script tự động

Dự án có sẵn script `deploy.sh` lo hết: cài thư viện, tạo bảng DB, build, seed dữ liệu, khởi động app.

Lần **đầu tiên** (có `--seed` để tạo admin + dữ liệu mẫu):

```bash
cd /var/www/sweet-store
bash deploy.sh --seed
```

Những lần cập nhật code **sau này** (không seed lại):

```bash
bash deploy.sh
```

Sau khi xong, kiểm tra app đang chạy:

```bash
pm2 status          # phải thấy sweet-store ở trạng thái online
pm2 logs sweet-store   # xem log, Ctrl+C để thoát
curl http://localhost:3000   # phải trả về HTML
```

> Tài khoản admin mặc định sau khi seed: `admin@sweetstore.vn` / `Admin@123456` — **đổi mật khẩu ngay** sau khi đăng nhập lần đầu.

---

## Phần 7 — Cấu hình Nginx (đưa web ra ngoài internet)

```bash
# Copy file mẫu vào nginx
cp /var/www/sweet-store/deploy/nginx.conf.example /etc/nginx/sites-available/sweet-store

# Sửa domain trong file
nano /etc/nginx/sites-available/sweet-store
#   → thay tất cả 'yourdomain.com' bằng domain thật, lưu lại

# Bật site
ln -s /etc/nginx/sites-available/sweet-store /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default   # bỏ trang mặc định

# Kiểm tra cú pháp và reload
nginx -t
systemctl reload nginx
```

Giờ mở trình duyệt vào `http://shopcuaban.com` — web đã hiện (chưa có khóa HTTPS).

---

## Phần 8 — Bật HTTPS miễn phí (Let's Encrypt)

```bash
certbot --nginx -d shopcuaban.com -d www.shopcuaban.com
```

Làm theo hướng dẫn trên màn hình:
- Nhập email (để nhận thông báo gia hạn)
- Đồng ý điều khoản (`Y`)
- Chọn **redirect** (ép tất cả về HTTPS) khi được hỏi

Xong! Vào `https://shopcuaban.com` sẽ thấy ổ khóa xanh. Certbot tự gia hạn chứng chỉ, bạn không phải làm gì thêm.

---

## Phần 9 — Cấu hình trong trang Admin

Đăng nhập `https://shopcuaban.com/login` bằng tài khoản admin, vào trang quản trị và cấu hình:

1. **Thanh toán SePay**: Admin → Thanh toán → dán API Key, số tài khoản, mã ngân hàng; copy **link webhook** dán vào SePay (có hướng dẫn từng bước ngay trong trang).
2. **Mail theo domain**: Admin → Kết nối & Thông báo → mục Mail. Chọn chế độ:
   - **Relay** (đơn giản): điền SMTP của nhà cung cấp mail bạn đang dùng.
   - **Direct** (gửi thẳng từ domain): bấm **Tạo khóa DKIM**, rồi thêm các bản ghi DNS (SPF/DKIM/DMARC/PTR) theo hướng dẫn hiện ra. Lưu ý chế độ này cần VPS mở **port 25 outbound** (một số nhà cung cấp chặn — liên hệ họ mở).
3. **Bot Telegram**: Admin → Kết nối & Thông báo → thêm bot theo bộ phận (Sale/Kỹ thuật/Kế toán), chọn loại thông báo nhận, bấm **Đăng ký webhook**.

---

## Phần 10 — Cập nhật code về sau

Mỗi khi có code mới:

```bash
cd /var/www/sweet-store
bash deploy.sh        # tự pull (nếu dùng git), build, reload
```

Nếu upload thủ công (cách B), đẩy file mới từ local rồi chạy `bash deploy.sh` trên VPS.

---

## Xử lý sự cố thường gặp

| Triệu chứng | Cách xử lý |
|-------------|------------|
| `pm2 status` thấy `errored` | `pm2 logs sweet-store` để xem lỗi. Thường do `.env` sai `DATABASE_URL`. |
| Web báo 502 Bad Gateway | App chưa chạy. Kiểm tra `pm2 status`, `curl http://localhost:3000`. |
| `prisma db push` lỗi kết nối | Sai user/password/database trong `DATABASE_URL`. Kiểm tra lại bước 3.3. |
| Mail không gửi được (chế độ direct) | Nhà cung cấp VPS chặn port 25. Đổi sang chế độ **relay** hoặc xin mở port 25. |
| Certbot báo lỗi xác thực | DNS chưa trỏ đúng về VPS. Đợi DNS cập nhật rồi chạy lại. |
| Sửa `.env` xong không ăn | Reload app: `pm2 reload sweet-store --update-env`. |

### Vài lệnh hữu ích

```bash
pm2 logs sweet-store      # xem log realtime
pm2 restart sweet-store   # khởi động lại app
pm2 monit                 # theo dõi CPU/RAM
systemctl status nginx    # trạng thái nginx
journalctl -u postgresql  # log database
```

---

Chúc bạn deploy thành công! Nếu gặp lỗi, đọc kỹ thông báo trong `pm2 logs` — phần lớn vấn đề nằm ở file `.env` hoặc DNS chưa trỏ đúng.
