# Hướng dẫn cấu hình SePay (chuyển khoản ngân hàng tự động)

SePay theo dõi tài khoản ngân hàng của cửa hàng và gọi webhook về website mỗi
khi có tiền vào. Khách chuyển khoản đúng số tiền + đúng nội dung (mã tham
chiếu), đơn hàng sẽ tự xác nhận — thường trong vòng một phút — mà không cần
khách gửi biên lai hay admin duyệt tay.

## Bước 1 — Phía SePay (my.sepay.vn)

1. Đăng nhập SePay, kết nối tài khoản ngân hàng nhận tiền của cửa hàng (nếu
   chưa kết nối).
2. Vào mục **Webhook** (Cấu hình → Webhooks) và tạo webhook mới:
   - **URL:** `https://<ten-mien-cua-ban>/api/webhooks/sepay`
     (URL chính xác cũng hiển thị sẵn trong Admin → Cài đặt → Thanh toán,
     mục SePay — chỉ cần copy).
   - **Kiểu xác thực:** API Key.
3. Tạo **API Key** trong SePay và ghi lại key này — sẽ cần dán vào admin ở
   Bước 2. SePay gửi key theo header `Authorization: Apikey <key>`.

## Bước 2 — Phía website (Admin → Cài đặt → Thanh toán, mục SePay)

Điền đầy đủ các trường sau:

| Trường | Giá trị |
| --- | --- |
| Webhook API key | API Key đã tạo ở Bước 1 |
| Bank code | Mã ngân hàng theo chuẩn VietQR (ví dụ `MB`, `VCB`, `TCB`) — dùng để tạo ảnh QR |
| Bank name | Tên ngân hàng hiển thị cho khách (ví dụ `MB Bank`) |
| Account number | Số tài khoản nhận tiền |
| Account holder | Tên chủ tài khoản |
| Extra instructions | (Tuỳ chọn) hướng dẫn thêm, hiển thị ở màn hình chuyển khoản |

Cuối cùng bật **Enabled**.

Lưu ý:

- Thiếu API key thì webhook **từ chối mọi yêu cầu** (fail-closed) — không ai
  có thể tự đánh dấu đơn đã thanh toán.
- SePay chỉ xuất hiện ở trang thanh toán khi đã bật **và** đã có số tài
  khoản **và** mã ngân hàng.
- Tiền tệ thu qua cổng này là tiền tệ thanh toán đã cấu hình (mặc định
  **VND**). Nếu giá sản phẩm tính bằng ngoại tệ, cần cấu hình tỷ giá tương
  ứng trong Admin → Cài đặt → Tiền tệ, nếu không đơn sẽ báo lỗi "chưa có tỷ
  giá".

## Mã tham chiếu chuyển khoản (nội dung CK) hoạt động ra sao

- Mỗi lần thanh toán, hệ thống sinh một mã duy nhất dạng **`<TIỀN_TỐ><SỐ>`**,
  mặc định là `DH100001`, `DH100002`, … (tiền tố mặc định `DH`, phần số bắt
  đầu từ `100000` — cả hai đổi được trong cài đặt thanh toán:
  `payment_ref_prefix`, `payment_ref_base`).
- Màn hình thanh toán hiển thị mã này cùng ảnh **VietQR** đã điền sẵn số tiền
  và nội dung, khách chỉ việc quét bằng app ngân hàng.
- Khi SePay báo tiền về, hệ thống trích mã từ nội dung chuyển khoản (bắt
  buộc phải có tiền tố, tránh nhầm với ngày tháng/số tài khoản trong ghi
  chú), đối chiếu đúng số tiền:
  - Thiếu tiền → không xác nhận, báo cho chủ shop qua Telegram.
  - Thừa tiền → vẫn xác nhận bình thường.
  - Không tìm thấy mã → tiền không bị "nuốt": hệ thống báo Telegram để xử
    lý thủ công.
- Mỗi giao dịch ngân hàng chỉ có thể tất toán **một lần** (mã giao dịch của
  SePay là duy nhất), webhook gửi trùng cũng không cộng tiền hai lần.

## Kiểm tra sau khi cấu hình

1. Tạo một đơn thử, chọn SePay ở bước thanh toán → phải thấy ảnh VietQR,
   đúng số tiền VND và nội dung chuyển khoản dạng `DH…`.
2. Chuyển khoản thử số tiền nhỏ với đúng nội dung → trang thanh toán tự
   chuyển sang trạng thái đã nhận tiền, đơn chuyển sang đã thanh toán.
3. Nếu tiền về mà đơn không xác nhận: kiểm tra lại API Key hai bên có khớp
   nhau không và URL webhook trong SePay có đúng domain đang chạy không.
