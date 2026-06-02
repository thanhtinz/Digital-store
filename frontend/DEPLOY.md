# Deploy Frontend Minimal Pro (Next.js) — VPS & Railway

Frontend này là app **Next.js tách biệt** với backend Express. Nó gọi backend qua biến
`NEXT_PUBLIC_HOST_API`. Backend phải bật CORS cho domain frontend (đã hỗ trợ qua env
`FRONTEND_URL` / `CORS_ORIGINS` ở backend).

> ⚠️ Biến `NEXT_PUBLIC_*` được **nhúng vào bundle lúc build**, không phải lúc chạy.
> Nên phải truyền URL backend **khi build** (Docker `--build-arg`, Railway build var).

---

## 1. Biến môi trường

| Biến | Ý nghĩa | Ví dụ |
|------|---------|-------|
| `NEXT_PUBLIC_HOST_API` | URL backend Express (KHÔNG có `/` cuối) | `https://api.yourshop.com` |
| `PORT` | Cổng frontend chạy (runtime) | `3000` |

---

## 2. Railway

Frontend deploy thành **service riêng** (khác service backend).

1. Railway project → **New Service** → **GitHub Repo** → chọn repo này.
2. Service Settings → **Root Directory** = `frontend`.
   (Railway sẽ tự dùng `frontend/railway.json` → build bằng `Dockerfile`.)
3. **Variables** của service frontend:
   - `NEXT_PUBLIC_HOST_API = https://<backend-domain>`  ← URL service backend
   - (Railway tự set `PORT`.)
4. Vì `NEXT_PUBLIC_*` cần lúc build, đảm bảo biến này có **trước khi deploy**. Nếu
   đổi URL backend sau này → phải **Redeploy** để build lại.
5. Deploy → mở domain Railway của service frontend.

> Backend: nhớ thêm domain frontend vào `CORS_ORIGINS` (hoặc `FRONTEND_URL`) của
> service backend, rồi redeploy backend.

---

## 3. VPS (Docker)

```bash
cd frontend

# Build (nhúng URL backend vào bundle)
docker build \
  --build-arg NEXT_PUBLIC_HOST_API=https://api.yourshop.com \
  -t digitalstore-frontend .

# Chạy
docker run -d --name ds-frontend \
  -e PORT=3000 \
  -p 3000:3000 \
  --restart unless-stopped \
  digitalstore-frontend
```

Đặt Nginx reverse proxy trỏ domain → `127.0.0.1:3000`:

```nginx
server {
  server_name yourshop.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```
Rồi cấp SSL bằng `certbot --nginx -d yourshop.com`.

---

## 4. VPS (không Docker — PM2)

```bash
cd frontend
npm ci --legacy-peer-deps
NEXT_PUBLIC_HOST_API=https://api.yourshop.com npm run build

# Chạy bản standalone
PORT=3000 pm2 start .next/standalone/server.js --name ds-frontend
pm2 save
```
(Standalone tự gồm những gì cần; vẫn cần copy `public/` và `.next/static/` cạnh
`server.js` — `npm run build` đã đặt sẵn trong `.next/standalone`, chỉ cần chạy từ thư mục
gốc dự án để Next tìm đúng đường dẫn, hoặc dùng Docker để chắc chắn.)

> Cách chắc chắn nhất cho VPS là **dùng Docker** (mục 3) vì nó copy đúng layout standalone.

---

## 5. Trang công khai vs cần đăng nhập

- **Công khai (không cần login):** shop, danh sách sản phẩm, chi tiết sản phẩm, blog, chi tiết bài viết.
- **Cần đăng nhập:** thanh toán/checkout, tài khoản, và các trang quản trị trong dashboard.

Điều này do prop `disableGuard` trên `DashboardLayout` của từng trang quyết định
(xem `src/pages/dashboard/...`). Muốn mở/khóa trang nào thì thêm/bỏ `disableGuard`.

---

## 6. Checklist sau deploy

- [ ] Backend chạy, có Postgres + `JWT_SECRET`.
- [ ] `NEXT_PUBLIC_HOST_API` (build var) trỏ đúng backend.
- [ ] Backend `CORS_ORIGINS`/`FRONTEND_URL` chứa domain frontend.
- [ ] Mở trang shop khi **chưa đăng nhập** → thấy sản phẩm.
- [ ] Đăng nhập → vào được dashboard/checkout.
- [ ] Tạo 1 đơn test → đơn xuất hiện ở admin.
