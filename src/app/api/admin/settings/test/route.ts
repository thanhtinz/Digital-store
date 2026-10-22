import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { getSettings } from '@/lib/settings';
import { testStripeConnection } from '@/lib/stripe';
import { testPaypalConnection } from '@/lib/paypal';
import { testTelegram } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

// POST { gateway: "stripe" | "paypal" } — verifies the saved credentials.
export const POST = handler(async (req: NextRequest) => {
  await requireAdmin();
  const { gateway } = await req.json();

  if (gateway === 'stripe') {
    const s = await getSettings(['stripe_secret_key']);
    if (!s.stripe_secret_key) return jsonError(400, 'Hãy lưu khoá bí mật Stripe trước');
    const ok = await testStripeConnection(s.stripe_secret_key);
    return ok
      ? NextResponse.json({ ok: true, message: 'Đã xác thực kết nối Stripe' })
      : jsonError(400, 'Stripe từ chối khoá bí mật này');
  }
  if (gateway === 'paypal') {
    const s = await getSettings(['paypal_client_id', 'paypal_client_secret', 'paypal_mode']);
    if (!s.paypal_client_id || !s.paypal_client_secret) return jsonError(400, 'Hãy lưu thông tin PayPal trước');
    const ok = await testPaypalConnection(s.paypal_client_id, s.paypal_client_secret, s.paypal_mode);
    return ok
      ? NextResponse.json({ ok: true, message: `Đã xác thực kết nối PayPal (${s.paypal_mode})` })
      : jsonError(400, 'PayPal từ chối thông tin đăng nhập này');
  }
  if (gateway === 'telegram') {
    const s = await getSettings(['telegram_bot_token', 'telegram_chat_id']);
    if (!s.telegram_bot_token || !s.telegram_chat_id) return jsonError(400, 'Hãy lưu token bot và Chat ID trước');
    const ok = await testTelegram(s.telegram_bot_token, s.telegram_chat_id);
    return ok
      ? NextResponse.json({ ok: true, message: 'Đã gửi tin thử — kiểm tra Telegram của bạn' })
      : jsonError(400, 'Telegram từ chối thông tin này — kiểm tra lại token bot và Chat ID');
  }
  return jsonError(400, 'Cổng kiểm tra không hợp lệ');
});
