# Hướng dẫn Deploy lên VPS (cho người mới bắt đầu)

Tài liệu này hướng dẫn bạn đưa website **Sweet Premium Store** từ máy tính cá nhân (local) lên một máy chủ VPS để chạy thật trên internet, kèm domain, HTTPS và **hệ thống gửi mail theo domain riêng**. Mỗi bước đều có lệnh cụ thể, copy-paste là chạy được.

> Mục lục nhanh: Phần 0–8 là deploy cơ bản (web chạy + HTTPS). **Phần 9 là cài đặt mail server đầy đủ** (gửi mail từ `@domain-cua-ban`). Phần 10 trở đi là cấu hình admin, cập nhật và xử lý sự cố.

---

## Phần 0 — Bạn cần chuẩn bị gì

1. **Một VPS** chạy Ubuntu 22.04 hoặc 24.04 (ví dụ từ Vultr, DigitalOcean, Hetzner, hoặc VPS Việt Nam). Cấu hình tối thiểu: 1 CPU, 2GB RAM.
2. **Một tên miền** (domain) đã mua, ví dụ `shopcuaban.com`.
3. **Phần mềm trên máy local**: một trình terminal (Terminal trên Mac/Linux, hoặc PowerShell/Windows Terminal trên Windows).
4. **Thông tin VPS**: địa chỉ IP, tài khoản `root` và mật khẩu (nhà cung cấp gửi qua email khi tạo VPS).

> 📧 **Nếu định gửi mail từ domain riêng** (chế độ `direct`): hãy chọn nhà cung cấp VPS **không chặn port 25 outbound** và **cho phép cấu hình PTR (reverse DNS)**. Các nhà uy tín cho việc này: Hetzner (mở port 25 khi xin), Contabo, OVH, BuyVM. Một số nhà như DigitalOcean/Vultr/Google Cloud **chặn port 25** — khi đó bạn dùng chế độ `relay` (Phần 9C).

---

## Phần 1 — Trỏ domain về VPS

Vào trang quản lý domain (nơi bạn mua tên miền), tạo các bản ghi DNS dạng A:

| Loại | Tên (Host) | Giá trị (trỏ tới) | Dùng để |
|------|------------|-------------------|---------|
| A    | `@`        | IP của VPS        | Website chính |
| A    | `www`      | IP của VPS        | www |
| A    | `mail`     | IP của VPS        | Hostname mail (cần cho Phần 9) |

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

### 3.1. Đặt hostname (quan trọng cho mail)

```bash
hostnamectl set-hostname mail.shopcuaban.com
```

### 3.2. Cập nhật hệ thống

```bash
apt update && apt upgrade -y
```

### 3.3. Cài Node.js 20 (LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # kiểm tra: phải ra v20.x
```

### 3.4. Cài PostgreSQL (database)

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

### 3.5. Cài Nginx (web server) và Certbot (SSL miễn phí)

```bash
apt install -y nginx certbot python3-certbot-nginx
systemctl enable --now nginx
```

### 3.6. Cài PM2 (giữ app chạy 24/7)

```bash
npm install -g pm2
```

### 3.7. Mở tường lửa

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 25/tcp     # SMTP — cần cho gửi/nhận mail (Phần 9)
ufw allow 587/tcp    # SMTP submission (nếu dùng relay tự host)
ufw --force enable
```

> Nếu chắc chắn **không** tự gửi mail từ domain, có thể bỏ 2 dòng `25` và `587`.

---

## Phần 4 — Đưa code lên VPS

Có 2 cách, chọn **một**.

### Cách A — Dùng Git (khuyên dùng)

Trên VPS:

```bash
cd /var/www
git clone https://github.com/thanhtinz/Digital-store.git sweet-store
cd sweet-store
```

### Cách B — Upload thủ công từ máy local

Trên **máy local**, nén thư mục dự án rồi đẩy lên (thay IP):

```bash
# (chạy trên máy local, trong thư mục cha của dự án)
scp -r Digital-store root@123.45.67.89:/var/www/sweet-store
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
# Chuỗi kết nối DB — khớp với user/password/database đã tạo ở bước 3.4
DATABASE_URL="postgresql://sweetuser:doi_mat_khau_nay@localhost:5432/sweetstore"

# Khóa bí mật JWT — đặt một chuỗi ngẫu nhiên dài (xem mẹo bên dưới)
JWT_SECRET="..."

# Khóa tạo admin — chuỗi bí mật bất kỳ
ADMIN_SECRET="..."

# Domain thật của bạn (có https)
APP_BASE_URL="https://shopcuaban.com"

# IP của VPS — dùng để sinh hướng dẫn DNS cho mail (Phần 9)
SERVER_IP="123.45.67.89"

# Email gửi mặc định (có thể đặt sau trong Admin)
MAIL_FROM_EMAIL="no-reply@shopcuaban.com"
```

> **Mẹo tạo chuỗi ngẫu nhiên** cho `JWT_SECRET` / `ADMIN_SECRET`, chạy trên VPS:
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```
> Copy kết quả dán vào.

Các phần SePay, Telegram, và cấu hình mail chi tiết bạn **không cần** điền hết ở đây — sẽ cấu hình trong trang Admin sau khi web chạy.

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
pm2 status             # phải thấy sweet-store ở trạng thái online
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

## Phần 9 — Cài đặt hệ thống Mail (gửi mail từ domain riêng)

App này **tự gửi được email** (xác nhận đơn hàng, reset mật khẩu, thông báo) mà **không bắt buộc thuê dịch vụ ngoài**. Có **3 cách** dùng mail — đọc bảng sau để chọn cách phù hợp, rồi làm theo mục tương ứng (9A / 9B / 9C).

| Cách | Khi nào chọn | Ưu / Nhược |
|------|--------------|------------|
| **9A — Direct (app tự gửi)** | VPS **không bị chặn port 25** và cho đặt PTR | Miễn phí, không cần phần mềm thêm. App tự gửi thẳng tới hộp thư người nhận, ký DKIM. Cần cấu hình DNS đúng để không vào spam. |
| **9B — Mail server tự host (Mailcow)** | Muốn có **hộp thư đầy đủ** (gửi + nhận, webmail, nhiều địa chỉ `info@`, `cskh@`...) | Mạnh nhất, có giao diện webmail. Tốn RAM (khuyên ≥ 3GB) và phức tạp hơn. App gửi qua nó ở chế độ `relay`. |
| **9C — Relay qua SMTP ngoài** | VPS **bị chặn port 25**, hoặc muốn đơn giản nhất | Dùng SMTP của Gmail/Zoho/SendGrid/Mailgun/cPanel... Deliverability tốt, ít phải lo DNS. Có thể giới hạn số mail/ngày (Gmail ~500/ngày). |

> Cách hoạt động trong code: Admin → **Kết nối & Thông báo → Mail** chọn `mode` = `direct` hoặc `relay`. Mọi email hệ thống đều đi qua hàm `sendMail()` và tự chọn đường gửi theo cấu hình này.

### 9.0 — Kiểm tra port 25 outbound (làm trước, áp dụng cho 9A và 9B)

Trên VPS:

```bash
# Nếu kết nối được tới một MX bất kỳ là port 25 đang MỞ
timeout 5 bash -c 'cat < /dev/null > /dev/tcp/gmail-smtp-in.l.google.com/25' && echo "PORT 25 OPEN" || echo "PORT 25 BLOCKED"
```

- Ra `PORT 25 OPEN` → bạn làm được **9A** hoặc **9B**.
- Ra `PORT 25 BLOCKED` → nhà cung cấp chặn. Hãy **mở ticket xin mở port 25 outbound**, hoặc dùng **9C (relay)**.

### 9.1 — Đặt PTR / Reverse DNS (bắt buộc cho 9A & 9B)

PTR là bản ghi "ngược": IP của bạn phải phân giải về `mail.shopcuaban.com`. **Thiếu PTR → gần như chắc chắn vào spam.**

- PTR **không** đặt ở trang quản lý domain, mà đặt **trong bảng điều khiển của nhà cung cấp VPS** (mục *Reverse DNS* / *rDNS* / *PTR*).
- Đặt giá trị PTR cho IP của bạn = `mail.shopcuaban.com`.
- Đồng thời đảm bảo đã có bản ghi A: `mail.shopcuaban.com → IP VPS` (đã làm ở Phần 1).

Kiểm tra (đợi vài phút):

```bash
dig -x 123.45.67.89 +short     # phải ra: mail.shopcuaban.com.
```

---

### 9A — Chế độ Direct (app tự gửi, khuyên dùng nếu port 25 mở)

Ở cách này **không cần cài thêm phần mềm mail nào cả** — app chính là "mail server" gửi đi. Bạn chỉ cần tạo khóa DKIM và thêm vài bản ghi DNS.

**Bước 1 — Tạo khóa DKIM trong Admin**

1. Đăng nhập `https://shopcuaban.com/login` bằng tài khoản admin.
2. Vào **Kết nối & Thông báo → Mail**.
3. Chọn chế độ **Direct**.
4. Điền:
   - **Email gửi (from)**: `no-reply@shopcuaban.com`
   - **Tên hiển thị**: `Sweet Premium Store`
   - **DKIM domain**: `shopcuaban.com`
   - **DKIM selector**: `default` (để mặc định)
5. Bấm **Tạo khóa DKIM**. Hệ thống tự sinh khóa, **lưu private key vào DB**, và hiện ra **bản ghi DNS TXT** để bạn dán.

**Bước 2 — Thêm các bản ghi DNS** (tại trang quản lý domain)

Trang **Mail** cũng có nút xem "Hướng dẫn DNS" liệt kê đúng các giá trị (kèm IP và public key thật). Tổng quát gồm:

| Loại | Tên (Host) | Giá trị | Ý nghĩa |
|------|-----------|---------|---------|
| TXT (SPF) | `@` | `v=spf1 ip4:123.45.67.89 ~all` | Cho phép IP của bạn gửi mail thay mặt domain |
| TXT (DKIM) | `default._domainkey` | `v=DKIM1; k=rsa; p=<public key>` | Chữ ký xác thực — **dùng giá trị nút "Tạo khóa DKIM" trả về** |
| TXT (DMARC) | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:postmaster@shopcuaban.com` | Chính sách xử lý mail giả mạo |
| A | `mail` | `123.45.67.89` | Hostname mail (đã thêm ở Phần 1) |
| PTR | (IP của bạn) | `mail.shopcuaban.com` | Reverse DNS — đặt ở nhà cung cấp VPS (mục 9.1) |

> ⚠️ Bản ghi DKIM rất dài. Một số nhà DNS yêu cầu chia nhỏ chuỗi hoặc bỏ dấu ngoặc kép — dán nguyên giá trị nút tạo khóa trả về.

**Bước 3 — Gửi mail test**

Trong trang Mail, nhập email của bạn (Gmail càng tốt) và bấm **Gửi mail test**. Kiểm tra hộp thư:
- Vào **Inbox** → tuyệt vời.
- Vào **Spam** → kiểm tra lại SPF/DKIM/DMARC/PTR (xem mục 9.4).

---

### 9B — Tự host mail server đầy đủ bằng Mailcow (gửi + nhận + webmail)

Chọn cách này nếu bạn muốn **hộp thư thật** (đăng nhập webmail, nhận mail từ khách gửi tới `cskh@shopcuaban.com`, tạo nhiều địa chỉ). App sẽ gửi mail **qua Mailcow ở chế độ relay**.

> Yêu cầu: VPS **≥ 3GB RAM** (khuyên 4GB), port 25 mở (mục 9.0), PTR đã đặt (mục 9.1). Nên dùng **VPS riêng cho mail** nếu web đã chạy chật. Nếu chung VPS, đặt Mailcow ở subdomain `mail.shopcuaban.com` và đổi cổng web của Mailcow để không đụng Nginx.

**Bước 1 — Cài Docker**

```bash
curl -fsSL https://get.docker.com | sh
```

**Bước 2 — Tải Mailcow**

```bash
cd /opt
git clone https://github.com/mailcow/mailcow-dockerized
cd mailcow-dockerized
./generate_config.sh
#   → Khi hỏi "Mail server hostname (FQDN)": nhập  mail.shopcuaban.com
```

> Nếu VPS này **đã chạy Nginx cho web** (Phần 7), sửa `mailcow.conf`: đổi `HTTP_PORT` và `HTTPS_PORT` sang cổng khác (ví dụ `8080`/`8443`) rồi cho Nginx proxy sang. Nếu Mailcow ở VPS riêng thì để mặc định 80/443.

**Bước 3 — Khởi động**

```bash
docker compose pull
docker compose up -d
```

Mở `https://mail.shopcuaban.com` → đăng nhập admin Mailcow (mặc định `admin` / `moohoo` — **đổi ngay**).

**Bước 4 — Tạo domain & hộp thư trong Mailcow**

1. *Configuration → Mail Setup → Domains* → thêm `shopcuaban.com`.
2. *Mailboxes* → tạo hộp thư, ví dụ `no-reply@shopcuaban.com` (đặt mật khẩu mạnh).
3. Vào domain vừa tạo, bấm xem **DNS records** — Mailcow liệt kê đầy đủ **SPF, DKIM, DMARC, MX, autodiscover**. Dán tất cả vào DNS của domain. Đặc biệt:

| Loại | Tên | Giá trị |
|------|-----|---------|
| MX | `@` | `mail.shopcuaban.com` (priority 10) |
| TXT (SPF) | `@` | `v=spf1 mx ~all` |
| TXT (DKIM) | `dkim._domainkey` | (chuỗi Mailcow cung cấp) |
| TXT (DMARC) | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:postmaster@shopcuaban.com` |

**Bước 5 — Trỏ app gửi qua Mailcow (relay)**

Trong **Admin web → Kết nối & Thông báo → Mail**, chọn chế độ **Relay** và điền:

| Trường | Giá trị |
|--------|---------|
| Email gửi (from) | `no-reply@shopcuaban.com` |
| SMTP host | `mail.shopcuaban.com` |
| SMTP port | `587` |
| SMTP user | `no-reply@shopcuaban.com` |
| SMTP pass | (mật khẩu hộp thư vừa tạo) |

Bấm **Gửi mail test** để kiểm tra.

---

### 9C — Relay qua SMTP ngoài (đơn giản nhất, khi port 25 bị chặn)

Dùng SMTP của một dịch vụ sẵn có. App chỉ "đưa thư" cho họ gửi giúp.

**Bước 1 — Lấy thông tin SMTP** từ nhà cung cấp bạn chọn:

| Dịch vụ | Host | Port | User | Pass |
|---------|------|------|------|------|
| Gmail (App Password) | `smtp.gmail.com` | `587` | email Gmail | [App Password 16 ký tự](https://myaccount.google.com/apppasswords) |
| Zoho Mail | `smtp.zoho.com` | `587` | email Zoho | mật khẩu / app password |
| SendGrid | `smtp.sendgrid.net` | `587` | `apikey` | API key |
| Mailgun | `smtp.mailgun.org` | `587` | user SMTP Mailgun | mật khẩu SMTP |
| cPanel host của bạn | mail.domain | `465`/`587` | email đầy đủ | mật khẩu email |

> Với Gmail phải **bật 2FA** rồi tạo **App Password** (không dùng mật khẩu đăng nhập thường). Port `465` = SSL, port `587` = STARTTLS — app tự nhận biết (`secure` bật khi port = 465).

**Bước 2 — Điền trong Admin** (Kết nối & Thông báo → Mail → chế độ **Relay**):

| Trường | Ví dụ (Gmail) |
|--------|---------------|
| Email gửi (from) | `tencuaban@gmail.com` |
| SMTP host | `smtp.gmail.com` |
| SMTP port | `587` |
| SMTP user | `tencuaban@gmail.com` |
| SMTP pass | App Password |

Bấm **Gửi mail test**.

> Mẹo deliverability: nếu dùng domain riêng làm địa chỉ "from" (vd `no-reply@shopcuaban.com`) qua SendGrid/Mailgun, hãy thêm bản ghi **SPF + DKIM** mà dịch vụ đó cung cấp vào DNS để không bị vào spam.

### 9.4 — Kiểm tra & cải thiện deliverability (mọi cách)

1. **Mail-tester**: vào https://www.mail-tester.com, copy địa chỉ nó cho, vào Admin gửi mail test tới địa chỉ đó, rồi bấm "Check score". Mục tiêu **≥ 9/10**.
2. **Tự soi DNS** trên VPS:
   ```bash
   dig TXT shopcuaban.com +short                       # SPF
   dig TXT default._domainkey.shopcuaban.com +short    # DKIM
   dig TXT _dmarc.shopcuaban.com +short                # DMARC
   dig -x 123.45.67.89 +short                          # PTR
   ```
3. **Vào spam?** Thường do thiếu **PTR** hoặc **DKIM** chưa khớp. Soi lại 4 lệnh trên, sửa cho đủ.
4. **IP bị blacklist?** Kiểm tra tại https://mxtoolbox.com/blacklists.aspx. IP VPS mới đôi khi dính sẵn — gửi đơn gỡ (delist) theo link từng danh sách, hoặc xin nhà cung cấp đổi IP sạch.

---

## Phần 10 — Cấu hình còn lại trong trang Admin

Đăng nhập `https://shopcuaban.com/login` bằng tài khoản admin và cấu hình nốt:

1. **Thanh toán SePay**: Admin → Thanh toán → dán API Key, số tài khoản, mã ngân hàng; copy **link webhook** dán vào SePay (có hướng dẫn từng bước ngay trong trang).
2. **Bot Telegram**: Admin → Kết nối & Thông báo → thêm bot theo bộ phận (Sale/Kỹ thuật/Kế toán), chọn loại thông báo nhận, bấm **Đăng ký webhook**.
3. **Mail**: đã làm ở Phần 9.

---

## Phần 11 — Cập nhật code về sau

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
| `prisma db push` lỗi kết nối | Sai user/password/database trong `DATABASE_URL`. Kiểm tra lại bước 3.4. |
| Certbot báo lỗi xác thực | DNS chưa trỏ đúng về VPS. Đợi DNS cập nhật rồi chạy lại. |
| Sửa `.env` xong không ăn | Reload app: `pm2 reload sweet-store --update-env`. |

### Sự cố Mail

| Triệu chứng | Cách xử lý |
|-------------|------------|
| Mail test báo `Không tìm thấy MX` | Email người nhận sai, hoặc DNS chưa phân giải được. Thử gửi tới Gmail. |
| Mail test lỗi `connect ECONNREFUSED ...:25` (direct) | Port 25 outbound bị chặn (mục 9.0). Xin mở port 25, hoặc chuyển sang **relay** (9C). |
| Mail gửi được nhưng **vào Spam** | Thiếu PTR/DKIM/DMARC. Chạy 4 lệnh `dig` ở mục 9.4 và bổ sung cho đủ. Test điểm ở mail-tester. |
| Relay lỗi `Invalid login` (Gmail) | Phải dùng **App Password**, không dùng mật khẩu thường; tài khoản đã bật 2FA. |
| Relay lỗi `self signed certificate` | Sai port (đang dùng 465 mà khai 587 hoặc ngược lại). Thử đổi port tương ứng. |
| Đã đổi cấu hình mail nhưng không ăn | Cấu hình mail đọc từ DB mỗi lần gửi — không cần restart. Bấm lại **Gửi mail test** để xác nhận. |

### Vài lệnh hữu ích

```bash
pm2 logs sweet-store      # xem log realtime
pm2 restart sweet-store   # khởi động lại app
pm2 monit                 # theo dõi CPU/RAM
systemctl status nginx    # trạng thái nginx
journalctl -u postgresql  # log database
dig -x <IP-VPS> +short    # kiểm tra PTR (reverse DNS)
```

---

Chúc bạn deploy thành công! Nếu gặp lỗi, đọc kỹ thông báo trong `pm2 logs` — phần lớn vấn đề nằm ở file `.env` hoặc DNS chưa trỏ đúng. Riêng mail: 90% lỗi "vào spam" là do thiếu **PTR** hoặc **DKIM**.
