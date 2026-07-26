import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { getSettings } from '@/lib/settings';
import { testStripeConnection } from '@/lib/stripe';
import { testPaypalConnection } from '@/lib/paypal';

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
  return jsonError(400, 'Unknown gateway');
});
