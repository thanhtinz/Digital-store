import LegalPage from '@/components/LegalPage';
import { getLocale, getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return { title: getT()('meta.refund') };
}

export default function RefundPolicyPage() {
  const t = getT();
  return (
    <LegalPage title={t('legal.refundTitle')} updated={t('legal.updatedDate')}>
      {getLocale() === 'vi' ? <Vi /> : <En />}
    </LegalPage>
  );
}

function En() {
  return (
    <>
      <h2>Our promise</h2>
      <p>
        Every item we deliver should work exactly as described. If it doesn&apos;t, we make it right —
        with a replacement first, or a refund where a replacement isn&apos;t possible.
      </p>

      <h2>When you&apos;re covered</h2>
      <ul>
        <li>The delivered key/account is invalid, already used, or doesn&apos;t activate.</li>
        <li>The item is materially different from the product description.</li>
        <li>You paid but nothing was delivered within the promised time.</li>
      </ul>
      <p>Report the problem to support within <b>72 hours</b> of delivery, including your order code and a short description (screenshots help).</p>

      <h2>When refunds don&apos;t apply</h2>
      <ul>
        <li>The item was delivered, is valid, and works as described.</li>
        <li>Top-ups sent to details you entered incorrectly at checkout (e.g. wrong player ID).</li>
        <li>Change of mind after a working digital item has been revealed to you.</li>
      </ul>

      <h2>How refunds are paid</h2>
      <p>
        Approved refunds are issued to your original payment method via Stripe or PayPal, normally
        within 5–10 business days depending on your bank. Bank-transfer payments are refunded to
        your wallet balance or back to the sending account, whichever you prefer.
      </p>

      <h2>Chargebacks</h2>
      <p>
        Please contact support before opening a dispute with your bank — almost every issue is
        resolved faster this way. Fraudulent chargebacks lead to account suspension.
      </p>
    </>
  );
}

function Vi() {
  return (
    <>
      <h2>Cam kết của chúng tôi</h2>
      <p>
        Mọi sản phẩm chúng tôi giao đều phải hoạt động đúng như mô tả. Nếu không, chúng tôi sẽ xử lý
        cho bạn — ưu tiên đổi sản phẩm khác, hoặc hoàn tiền khi không thể đổi.
      </p>

      <h2>Trường hợp được bảo vệ</h2>
      <ul>
        <li>Key/tài khoản được giao không hợp lệ, đã bị dùng, hoặc không kích hoạt được.</li>
        <li>Sản phẩm khác biệt đáng kể so với mô tả.</li>
        <li>Bạn đã thanh toán nhưng không nhận được hàng trong thời gian cam kết.</li>
      </ul>
      <p>
        Hãy báo cho bộ phận hỗ trợ trong vòng <b>72 giờ</b> kể từ khi nhận hàng, kèm mã đơn hàng và mô
        tả ngắn gọn (có ảnh chụp màn hình càng tốt).
      </p>

      <h2>Trường hợp không hoàn tiền</h2>
      <ul>
        <li>Sản phẩm đã được giao, hợp lệ và hoạt động đúng mô tả.</li>
        <li>Nạp nhầm do bạn nhập sai thông tin khi thanh toán (ví dụ sai ID người chơi).</li>
        <li>Đổi ý sau khi nội dung sản phẩm số còn dùng được đã hiển thị cho bạn.</li>
      </ul>

      <h2>Hoàn tiền như thế nào</h2>
      <p>
        Các yêu cầu hoàn tiền được duyệt sẽ được hoàn về đúng phương thức thanh toán ban đầu qua
        Stripe hoặc PayPal, thường trong 5–10 ngày làm việc tùy ngân hàng của bạn. Với giao dịch
        chuyển khoản, chúng tôi hoàn vào số dư ví hoặc chuyển lại tài khoản đã gửi, tùy bạn chọn.
      </p>

      <h2>Khiếu nại qua ngân hàng (chargeback)</h2>
      <p>
        Vui lòng liên hệ hỗ trợ trước khi mở tranh chấp với ngân hàng — gần như mọi vấn đề đều được
        giải quyết nhanh hơn theo cách này. Việc khiếu nại gian dối sẽ dẫn tới khóa tài khoản.
      </p>
    </>
  );
}
