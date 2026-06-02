# Hướng dẫn đẩy code lên GitHub

Repo này đã được **khởi tạo git sẵn** với 1 commit đầu tiên (branch `main`). Bạn chỉ cần tạo repo trống trên GitHub rồi push lên.

---

## Bước 1 — Tạo repo trống trên GitHub

1. Vào https://github.com/new
2. Đặt tên repo, ví dụ: `sweet-premium-store`
3. **KHÔNG** tích "Add a README", "Add .gitignore", hay "license" (vì repo đã có sẵn các file này — tránh xung đột)
4. Bấm **Create repository**
5. Copy URL repo, dạng: `https://github.com/TEN-CUA-BAN/sweet-premium-store.git`

---

## Bước 2 — Giải nén và push

Giải nén file zip, mở terminal trong thư mục `yourai-ts`, rồi chạy (thay URL repo của bạn):

```bash
cd yourai-ts

# Nối repo local với repo GitHub
git remote add origin https://github.com/TEN-CUA-BAN/sweet-premium-store.git

# Đẩy lên
git push -u origin main
```

GitHub sẽ hỏi đăng nhập:
- **Username**: tên GitHub của bạn
- **Password**: KHÔNG dùng mật khẩu thường — phải dùng **Personal Access Token (PAT)**

### Tạo Personal Access Token (nếu chưa có)

1. Vào https://github.com/settings/tokens
2. **Generate new token** → **Generate new token (classic)**
3. Tích quyền **`repo`**
4. Bấm Generate, **copy token** (chỉ hiện 1 lần)
5. Khi `git push` hỏi password, dán token này vào

> Mẹo: để không phải nhập token mỗi lần, dùng:
> ```bash
> git config --global credential.helper store
> ```
> Lần push đầu nhập token, các lần sau git nhớ luôn.

---

## Nếu repo đã có sẵn .git nhưng muốn dùng SSH thay vì HTTPS

```bash
git remote add origin git@github.com:TEN-CUA-BAN/sweet-premium-store.git
git push -u origin main
```
(Cần đã cấu hình SSH key trong GitHub → Settings → SSH keys)

---

## Các lần cập nhật code sau này

```bash
git add -A
git commit -m "Mô tả thay đổi"
git push
```

---

## Lưu ý quan trọng

- File `.env` **KHÔNG** được commit (đã nằm trong `.gitignore`) — secrets của bạn an toàn, không bị lộ lên GitHub. Chỉ có `.env.example` (mẫu, không chứa secret thật) được đẩy lên.
- `node_modules/` và `dist/` cũng không commit — người clone về chỉ cần chạy `npm install` và `npm run build`.
- Nếu push báo lỗi `rejected` do repo GitHub đã có commit lạ, chạy: `git pull origin main --rebase` rồi push lại.
