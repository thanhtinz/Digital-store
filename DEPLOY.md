# Deploy Digital Store — 1 lần chạy hết

Toàn bộ (backend Express + frontend Next.js Minimal Pro) đóng gói trong **1 Docker
image duy nhất**. Bên trong:

- **Frontend Next.js** chạy ở cổng công khai (`$PORT`) — đây là web khách hàng.
- **Backend Express** chạy nội bộ cổng `4000` (API + trang admin `/admin`).
- Next.js tự proxy `/api`, `/admin`, `/static`, `/sitemap.xml`, `/robots.txt` sang
  backend nội bộ → **same-origin, KHÔNG cần cấu hình CORS, KHÔNG cần URL backend**.

Chỉ cần **1 service** và **1 lần deploy**.

---

## Bạn chỉ cần đặt các biến môi trường này

| Biến | Bắt buộc | Ý nghĩa |
|------|:---:|---------|
| `DATABASE_URL` | ✅ | PostgreSQL (Railway Postgres hoặc Neon/Supabase) |
| `JWT_SECRET` | ✅ | Chuỗi ngẫu nhiên ≥ 16 ký tự (ký token đăng nhập) |
| `PORT` | (tự có) | Railway/VPS tự cấp; Next.js dùng cổng này |

> KHÔNG cần `NEXT_PUBLIC_HOST_API`, KHÔNG cần `CORS_ORIGINS` — vì frontend và backend
> cùng một origin trong container.

---

## A. Railway (khuyên dùng)

1. **New Project → Deploy from GitHub repo** → chọn repo này.
   Railway đọc `railway.json` ở gốc → build bằng `Dockerfile` (đã gộp sẵn).
2. **Add → Database → PostgreSQL** trong cùng project.
3. Vào service app → **Variables**:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (tham chiếu service Postgres)
   - `JWT_SECRET` = chuỗi ngẫu nhiên dài (vd chạy `openssl rand -hex 32`)
4. Deploy. Mở domain Railway → ra ngay web khách. Admin ở `/admin`.

Khi container khởi động, nó tự chạy `prisma db push` để tạo bảng.

### Tạo tài khoản admin / dữ liệu mẫu (1 lần)
Mở tab **Shell** của service (hoặc chạy local trỏ vào `DATABASE_URL` prod):
```bash
npm run db:seed
```

---

## B. VPS (Docker)

```bash
git clone <repo> digital-store && cd digital-store

docker build -t digital-store .

docker run -d --name digital-store \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e JWT_SECRET="$(openssl rand -hex 32)" \
  -e PORT=3000 \
  -p 3000:3000 \
  --restart unless-stopped \
  digital-store
```

Nginx trỏ domain → `127.0.0.1:3000`, rồi `certbot --nginx -d yourshop.com` để có SSL.

Seed lần đầu:
```bash
docker exec -it digital-store npm run db:seed
```

> Cần Postgres? Có thể chạy thêm 1 container Postgres hoặc dùng DB ngoài (Neon/Supabase)
> rồi điền vào `DATABASE_URL`.

---

## Bản đồ đường dẫn

| Đường dẫn | Phục vụ bởi | Cần đăng nhập? |
|-----------|-------------|:---:|
| `/`, shop, chi tiết sản phẩm, blog | Next.js | ❌ công khai |
| `/dashboard/...` (checkout, tài khoản) | Next.js | ✅ |
| `/admin` | Express (admin SPA) | ✅ (admin) |
| `/api/*` | Express | tùy endpoint |
| `/static/*` (ảnh upload, banner) | Express | ❌ |

---

## Phát triển local (tách 2 tiến trình cho tiện)

```bash
# Terminal 1 — backend
npm install && npm run dev            # http://localhost:3000

# Terminal 2 — frontend
cd frontend
npm install --legacy-peer-deps
echo "NEXT_PUBLIC_HOST_API=http://localhost:3000" > .env.local
npm run dev                           # http://localhost:8081
```
Local dùng `NEXT_PUBLIC_HOST_API` (axios gọi thẳng backend). Khi build Docker thì biến
này để rỗng → tự dùng proxy same-origin.

---

## Checklist sau deploy
- [ ] `DATABASE_URL` + `JWT_SECRET` đã set.
- [ ] Mở domain → thấy web khách (chưa đăng nhập vẫn xem được sản phẩm/blog).
- [ ] `/admin` đăng nhập admin được.
- [ ] Đặt 1 đơn test → đơn hiện trong admin.
