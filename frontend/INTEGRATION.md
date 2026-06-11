# Digital Store — Frontend (Minimal Pro v4.1.0)

Đây là frontend dùng **bản gốc Minimal TypeScript Pro v4.1.0** (Next.js Pages Router + MUI v5), đã được nối với **backend Digital Store** (Express API). Mọi trang Minimal (e-commerce, dashboard, user, invoice...) được giữ nguyên thiết kế.

## Cài đặt & chạy

```bash
npm install --legacy-peer-deps
npm run dev      # http://localhost:3039
```

Backend Express chạy song song ở `http://localhost:3000`.

## Cấu hình kết nối backend

File `.env.local`:
```
NEXT_PUBLIC_HOST_API=http://localhost:3000   # URL backend Digital Store
HOST_API_KEY=http://localhost:3000
```
Khi deploy, đổi thành domain backend thật, ví dụ `https://api.digitalstore.vn`.

## Đã nối API như thế nào

Thay vì sửa từng trang, mình dùng **lớp adapter** trong `src/utils/axios.ts`:

1. **Token tự động** — interceptor gắn `Authorization: Bearer <token>` từ `localStorage.accessToken` vào mọi request.
2. **Chuyển đổi dữ liệu** — backend Digital Store trả field kiểu `image_url`, `price_from`, `original_price`... còn Minimal cần `cover`, `price`, `priceSale`. Hàm `adaptProduct()` tự map giữa 2 format khi response đi qua, nên các trang Minimal nhận đúng dữ liệu mà không phải sửa.

Endpoint sản phẩm đã chỉnh trong `src/redux/slices/product.ts`:
- `getProducts()` → `GET /api/products` (đọc `data.products`)
- `getProduct(slug)` → `GET /api/products/:slug` (đọc `data.product`)

## Các phần cần nối tiếp (theo nhu cầu)

Mỗi nhóm tính năng của Minimal nằm trong `src/redux/slices/` và gọi qua `axios`. Để nối thêm:

| Tính năng | File slice | Endpoint Digital Store |
|-----------|-----------|------------------------|
| Sản phẩm | `slices/product.ts` | `/api/products`, `/api/products/:slug` ✅ đã nối |
| Đơn hàng / Checkout | `slices/product.ts` (cart) | `/api/orders`, `/api/payment` |
| User / Account | `slices/user.ts` | `/api/auth/me`, `/api/balance/me` |
| Blog | `slices/blog.ts` | `/api/blog/posts`, `/api/blog/posts/:slug` |
| Chat | `slices/chat.ts` | `/api/chat` |
| Kanban / Calendar / Mail | tương ứng | (tùy có dùng hay không) |

Cách nối: mở slice → đổi đường dẫn `axios.get('/api/...')` cho khớp endpoint Digital Store → nếu field khác tên thì thêm nhánh map trong `adaptProduct`-style ở `axios.ts`.

## Auth

Minimal hỗ trợ nhiều provider (JWT, Firebase, Auth0...). Digital Store dùng **JWT**, nên dùng `AuthProvider` JWT của Minimal (`src/auth/JwtContext.tsx`) và trỏ các endpoint:
- Login: `POST /api/auth/login` → trả `{ access_token, user }`
- Register: `POST /api/auth/register`
- Me: `GET /api/auth/me`

Lưu token vào `localStorage.accessToken` (adapter đã đọc key này).

## Branding

- Tên app: `package.json` → `digital-store-frontend`
- Logo: `src/components/logo/Logo.tsx`
- Tên hiển thị, màu, SEO: `src/config-global.ts`
- Màu chủ đạo (đang là Minimal green `#00AB55`): `src/theme/palette.ts`

---

## Cập nhật: đã nối các module (lượt 2)

✅ **Auth (JWT)** — `src/auth/JwtContext.tsx`: login `/api/auth/login`, register `/api/auth/register`, me `/api/auth/me`, đọc `access_token`.
✅ **Sản phẩm** — shop, chi tiết, list (qua adapter + redux product slice).
✅ **Checkout** — `CheckoutPayment.tsx`: bước cuối gọi `POST /api/orders` tạo đơn thật từ cart.
✅ **Blog** — list `/api/blog/posts`, chi tiết `/api/blog/posts/:slug` (qua adapter `adaptPost`).
✅ **User Account** — sửa thông tin `PATCH /api/auth/me`, đổi mật khẩu `POST /api/auth/change-password`.
✅ **User List (admin)** — `GET /api/admin/users` (fallback mock nếu backend offline).

⚙️ **Quan trọng:** `next.config.js` đã đổi `HOST_API_KEY` từ API demo của Minimal sang `process.env.NEXT_PUBLIC_HOST_API` (backend Digital Store). Đặt biến này khi deploy.

### Các trang vẫn dùng mock (backend Digital Store không có nghiệp vụ tương ứng)
- Banking, Booking, File Manager, Invoice, Kanban, Mail, Calendar — Minimal demo, giữ nguyên mock. Nếu sau này backend có endpoint, nối tương tự (sửa slice/section + thêm adapter).
- Analytics/Ecommerce dashboard: biểu đồ dùng mock — có thể thay bằng `/api/admin/dashboard` khi muốn.

---

## Cập nhật: "Nối hết" (lượt 3)

Hoàn tất các điểm còn hở để mọi luồng e-commerce/blog chạy thật end-to-end.

✅ **Tìm kiếm sản phẩm** — ô search trong shop (`ShopProductSearch`) gọi `GET /api/products/search?query=` → backend trả `{ results }` (route mới trong `src/routes/products.ts`). Adapter chuẩn hoá `data.results`.
✅ **Tìm kiếm blog** — `BlogPostsSearch` gọi `GET /api/blog/posts/search?query=` → backend route mới trong `src/routes/misc.ts`, trả `{ results }`.
✅ **Blog list/detail** — backend trả `{ items }`; adapter nay đồng bộ về cả `data.posts` và `data.results`, và map đúng field camelCase (`thumbnailUrl`, `viewCount`, `publishedAt`) trong `adaptPost`.
✅ **Checkout theo GÓI (quan trọng)** — backend bán theo `package_id` (ProductPackage), không theo size/màu. Trang chi tiết (`ProductDetailsSummary.tsx`) nay:
  - Nếu sản phẩm có `packages` → hiện ô **chọn Gói** (thay cho Color/Size), cập nhật giá theo gói.
  - Lưu `packageId` + `packageName` vào cart item (type `ICheckoutCartItem`).
  - `CheckoutPayment.tsx` map `package_id = Number(item.packageId)` và **lọc bỏ** item không có gói hợp lệ trước khi `POST /api/orders` → không còn lỗi "Không tìm thấy gói".
  - Nếu sản phẩm không có gói → vẫn dùng Color/Size như Minimal gốc (có guard khi mảng rỗng).

### Tóm tắt trạng thái nối
| Nhóm | Trạng thái |
|------|-----------|
| Auth (login/register/me/đổi mật khẩu) | ✅ thật |
| Sản phẩm (list/detail/search) | ✅ thật |
| Đơn hàng / Checkout (theo gói) | ✅ thật |
| Blog (list/detail/search) | ✅ thật |
| User list (admin) | ✅ thật |
| Chat, Kanban, Calendar, Mail, Invoice, Banking… | ⛔ mock (backend không có nghiệp vụ) |
