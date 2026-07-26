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
    if (!s.stripe_secret_key) return jsonError(400, 'Save your Stripe secret key first');
    const ok = await testStripeConnection(s.stripe_secret_key);
    return ok
      ? NextResponse.json({ ok: true, message: 'Stripe connection verified' })
      : jsonError(400, 'Stripe rejected the secret key');
  }
  if (gateway === 'paypal') {
    const s = await getSettings(['paypal_client_id', 'paypal_client_secret', 'paypal_mode']);
    if (!s.paypal_client_id || !s.paypal_client_secret) return jsonError(400, 'Save your PayPal credentials first');
    const ok = await testPaypalConnection(s.paypal_client_id, s.paypal_client_secret, s.paypal_mode);
    return ok
      ? NextResponse.json({ ok: true, message: `PayPal connection verified (${s.paypal_mode})` })
      : jsonError(400, 'PayPal rejected the credentials');
  }
  if (gateway === 'telegram') {
    const s = await getSettings(['telegram_bot_token', 'telegram_chat_id']);
    if (!s.telegram_bot_token || !s.telegram_chat_id) return jsonError(400, 'Save your bot token and chat ID first');
    const ok = await testTelegram(s.telegram_bot_token, s.telegram_chat_id);
    return ok
      ? NextResponse.json({ ok: true, message: 'Test message sent — check your Telegram' })
      : jsonError(400, 'Telegram rejected the credentials — check the bot token and chat ID');
  }
  return jsonError(400, 'Unknown gateway');
});
