import LegalPage from '@/components/LegalPage';
import { getLocale, getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return { title: getT()('meta.terms') };
}

// Legal prose is kept as whole documents per language rather than
// sentence-level keys — a policy has to read as one coherent text.
export default function TermsPage() {
  const t = getT();
  return (
    <LegalPage title={t('legal.termsTitle')} updated={t('legal.updatedDate')}>
      {getLocale() === 'vi' ? <Vi /> : <En />}
    </LegalPage>
  );
}

function En() {
  return (
    <>
      <h2>1. Agreement</h2>
      <p>
        By creating an account or purchasing from this store you agree to these Terms of Service.
        If you do not agree, please do not use the site.
      </p>

      <h2>2. Digital products</h2>
      <p>
        We sell digital goods — subscriptions, license keys, in-game credits and similar items.
        Delivery is electronic: items appear on your order page and are emailed to the address on
        your account. No physical shipment takes place.
      </p>

      <h2>3. Accounts</h2>
      <p>
        You are responsible for keeping your credentials safe. We strongly recommend enabling
        two-factor authentication. You must provide accurate information at checkout — in
        particular any product-specific fields (such as a player ID); deliveries made to details
        you entered incorrectly may not be recoverable.
      </p>

      <h2>4. Payments</h2>
      <p>
        Payments are processed by Stripe, PayPal and our Vietnamese bank-transfer gateways on their
        secure hosted pages. We never see or store card numbers. Prices are shown in the store
        currency at checkout; your bank may apply conversion fees.
      </p>

      <h2>5. Acceptable use</h2>
      <p>
        You may not use the store for fraud, resale in violation of a product&apos;s license, or any
        unlawful purpose. We may suspend accounts involved in chargeback abuse, payment fraud or
        attempts to compromise the platform.
      </p>

      <h2>6. Refunds</h2>
      <p>
        Digital goods that have been delivered and are valid as described are generally not
        refundable. Invalid or misdescribed items are replaced or refunded per our Refund Policy.
      </p>

      <h2>7. Liability</h2>
      <p>
        The store is provided &quot;as is&quot;. To the maximum extent permitted by law, our total
        liability for any claim is limited to the amount you paid for the order concerned.
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update these terms from time to time. Material changes will be announced on the
        site; continued use after a change constitutes acceptance.
      </p>
    </>
  );
}

function Vi() {
  return (
    <>
      <h2>1. Chấp thuận điều khoản</h2>
      <p>
        Khi tạo tài khoản hoặc mua hàng tại cửa hàng này, bạn đồng ý với các Điều khoản dịch vụ dưới
        đây. Nếu bạn không đồng ý, vui lòng không sử dụng website.
      </p>

      <h2>2. Sản phẩm số</h2>
      <p>
        Chúng tôi bán hàng hóa số — gói đăng ký, key bản quyền, tiền trong game và các sản phẩm
        tương tự. Việc giao hàng hoàn toàn diễn ra điện tử: sản phẩm hiển thị trên trang đơn hàng của
        bạn và được gửi vào email đăng ký tài khoản. Không có giao hàng vật lý.
      </p>

      <h2>3. Tài khoản</h2>
      <p>
        Bạn có trách nhiệm giữ an toàn thông tin đăng nhập của mình. Chúng tôi khuyến nghị bật xác
        thực hai lớp. Bạn phải cung cấp thông tin chính xác khi thanh toán — đặc biệt là các trường
        riêng của từng sản phẩm (ví dụ ID người chơi); hàng đã giao theo thông tin bạn nhập sai có
        thể không lấy lại được.
      </p>

      <h2>4. Thanh toán</h2>
      <p>
        Thanh toán được xử lý bởi Stripe, PayPal và các cổng chuyển khoản ngân hàng Việt Nam trên
        trang bảo mật của họ. Chúng tôi không bao giờ thấy hay lưu số thẻ của bạn. Giá được hiển thị
        theo đơn vị tiền tệ của cửa hàng khi thanh toán; ngân hàng của bạn có thể thu thêm phí quy
        đổi.
      </p>

      <h2>5. Sử dụng hợp lệ</h2>
      <p>
        Bạn không được dùng cửa hàng để gian lận, bán lại vi phạm giấy phép của sản phẩm, hoặc cho
        bất kỳ mục đích trái pháp luật nào. Chúng tôi có thể khóa những tài khoản lạm dụng
        chargeback, gian lận thanh toán hoặc tìm cách xâm nhập hệ thống.
      </p>

      <h2>6. Hoàn tiền</h2>
      <p>
        Hàng hóa số đã được giao và hợp lệ đúng như mô tả thì thường không được hoàn tiền. Sản phẩm
        không dùng được hoặc sai mô tả sẽ được đổi hoặc hoàn tiền theo Chính sách hoàn tiền của
        chúng tôi.
      </p>

      <h2>7. Giới hạn trách nhiệm</h2>
      <p>
        Cửa hàng được cung cấp &quot;nguyên trạng&quot;. Trong phạm vi tối đa pháp luật cho phép,
        tổng trách nhiệm của chúng tôi với bất kỳ khiếu nại nào được giới hạn ở số tiền bạn đã trả
        cho đơn hàng liên quan.
      </p>

      <h2>8. Thay đổi điều khoản</h2>
      <p>
        Chúng tôi có thể cập nhật các điều khoản này theo thời gian. Những thay đổi quan trọng sẽ
        được thông báo trên website; việc bạn tiếp tục sử dụng sau khi thay đổi đồng nghĩa với việc
        chấp thuận.
      </p>
    </>
  );
}
