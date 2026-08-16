import LegalPage from '@/components/LegalPage';
import { getLocale, getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return { title: getT()('meta.privacy') };
}

export default function PrivacyPage() {
  const t = getT();
  return (
    <LegalPage title={t('legal.privacyTitle')} updated={t('legal.updatedDate')}>
      {getLocale() === 'vi' ? <Vi /> : <En />}
    </LegalPage>
  );
}

function En() {
  return (
    <>
      <h2>1. What we collect</h2>
      <p>
        Account data (name, email, password hash), order data (items purchased, checkout fields you
        enter, payment references — never card numbers), and security data (sign-in history with IP
        address and device, used for fraud prevention and the login history you can view yourself).
      </p>

      <h2>2. How we use it</h2>
      <ul>
        <li>To deliver your purchases and send transactional email (receipts, delivery, security alerts).</li>
        <li>To protect accounts — rate limiting, lockout after failed sign-ins, session management.</li>
        <li>To provide support and handle refunds.</li>
      </ul>
      <p>We do not sell your personal data, and we do not send marketing email without consent.</p>

      <h2>3. Payment data</h2>
      <p>
        Card and PayPal details are handled entirely by Stripe and PayPal on their own PCI-DSS
        compliant infrastructure. Bank transfers are matched by a reference code only. We store just
        a payment reference used to reconcile your order.
      </p>

      <h2>4. Cookies</h2>
      <p>
        We use a session cookie to keep you signed in, plus two small preference cookies that
        remember your chosen language and appearance. No third-party advertising or tracking
        cookies are set.
      </p>

      <h2>5. Retention &amp; deletion</h2>
      <p>
        Order records are retained for accounting purposes. You may delete your account and
        associated personal data from your account page or by contacting support; data we are
        legally required to keep (e.g. invoices) is retained for the statutory period.
      </p>

      <h2>6. Your rights</h2>
      <p>
        Depending on your jurisdiction (including GDPR and CCPA), you may have rights to access,
        correct, export or delete your personal data. Contact support to exercise them.
      </p>
    </>
  );
}

function Vi() {
  return (
    <>
      <h2>1. Chúng tôi thu thập những gì</h2>
      <p>
        Dữ liệu tài khoản (tên, email, chuỗi băm mật khẩu), dữ liệu đơn hàng (sản phẩm đã mua, các
        trường bạn nhập khi thanh toán, mã tham chiếu thanh toán — không bao giờ là số thẻ), và dữ
        liệu bảo mật (lịch sử đăng nhập kèm địa chỉ IP và thiết bị, dùng để phòng chống gian lận và
        để chính bạn xem lại).
      </p>

      <h2>2. Chúng tôi dùng dữ liệu để làm gì</h2>
      <ul>
        <li>Giao hàng cho bạn và gửi email giao dịch (hóa đơn, nội dung sản phẩm, cảnh báo bảo mật).</li>
        <li>Bảo vệ tài khoản — giới hạn tần suất, khóa tạm sau nhiều lần đăng nhập sai, quản lý phiên.</li>
        <li>Hỗ trợ khách hàng và xử lý hoàn tiền.</li>
      </ul>
      <p>Chúng tôi không bán dữ liệu cá nhân của bạn và không gửi email quảng cáo khi chưa có sự đồng ý.</p>

      <h2>3. Dữ liệu thanh toán</h2>
      <p>
        Thông tin thẻ và PayPal do Stripe và PayPal xử lý hoàn toàn trên hạ tầng đạt chuẩn PCI-DSS
        của họ. Giao dịch chuyển khoản chỉ được đối soát qua mã nội dung chuyển khoản. Chúng tôi chỉ
        lưu một mã tham chiếu thanh toán để đối chiếu với đơn hàng của bạn.
      </p>

      <h2>4. Cookie</h2>
      <p>
        Chúng tôi dùng một cookie phiên để giữ bạn ở trạng thái đã đăng nhập, cùng hai cookie nhỏ ghi
        nhớ ngôn ngữ và giao diện bạn chọn. Không có cookie quảng cáo hay theo dõi của bên thứ ba.
      </p>

      <h2>5. Lưu trữ &amp; xóa dữ liệu</h2>
      <p>
        Hồ sơ đơn hàng được giữ lại phục vụ mục đích kế toán. Bạn có thể xóa tài khoản cùng dữ liệu
        cá nhân liên quan ngay trong trang tài khoản hoặc bằng cách liên hệ hỗ trợ; những dữ liệu
        pháp luật bắt buộc phải lưu (ví dụ hóa đơn) sẽ được giữ trong thời hạn luật định.
      </p>

      <h2>6. Quyền của bạn</h2>
      <p>
        Tùy theo pháp luật nơi bạn cư trú (bao gồm GDPR và CCPA), bạn có thể có quyền truy cập, sửa,
        xuất hoặc xóa dữ liệu cá nhân của mình. Hãy liên hệ hỗ trợ để thực hiện các quyền này.
      </p>
    </>
  );
}
