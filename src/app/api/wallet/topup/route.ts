import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { rateLimit } from '@/lib/rateLimit';
import { generateTopupCode } from '@/lib/wallet';
import { getStripeConfig, toStripeAmount } from '@/lib/stripe';
import { getPaypalConfig } from '@/lib/paypal';
import { getAppUrl, getSetting } from '@/lib/settings';

export const dynamic = 'force-dynamic';

const MIN_TOPUP = 5;
const MAX_TOPUP = 1000;

// Creates a wallet top-up and returns the gateway redirect URL.
export const POST = handler(async (req: NextRequest) => {
  const user = await requireUser();
  rateLimit('topup', 10, 60 * 60, String(user.id));
  const b = await req.json();
  const amount = Math.round(Number(b.amount) * 100) / 100;
  const method = b.method === 'paypal' ? 'paypal' : 'stripe';
  if (!Number.isFinite(amount) || amount < MIN_TOPUP || amount > MAX_TOPUP) {
    return jsonError(400, `Top-up amount must be between $${MIN_TOPUP} and $${MAX_TOPUP}`);
  }

  const currency = (await getSetting('currency')) || 'USD';
  const appUrl = await getAppUrl();
  const topup = await prisma.topup.create({
    data: { code: generateTopupCode(), userId: user.id, amount, method },
  });

  try {
    let redirectUrl: string;
    if (method === 'stripe') {
      const cfg = await getStripeConfig();
      if (!cfg.enabled) throw new Error('Card payments are not available right now');
      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          mode: 'payment',
          customer_email: user.email,
          'payment_method_types[0]': 'card',
          'line_items[0][quantity]': '1',
          'line_items[0][price_data][currency]': currency.toLowerCase(),
          'line_items[0][price_data][unit_amount]': String(toStripeAmount(amount, currency)),
          'line_items[0][price_data][product_data][name]': `Wallet top-up ${topup.code}`,
          'metadata[topup_code]': topup.code,
          success_url: `${appUrl}/wallet?topup=success`,
          cancel_url: `${appUrl}/wallet?topup=cancelled`,
        }).toString(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Stripe error');
      await prisma.topup.update({ where: { id: topup.id }, data: { paymentRef: json.id } });
      redirectUrl = json.url;
    } else {
      const cfg = await getPaypalConfig();
      if (!cfg.enabled) throw new Error('PayPal payments are not available right now');
      const tokenRes = await fetch(`${cfg.apiBase}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok) throw new Error('PayPal authentication failed');
      const res = await fetch(`${cfg.apiBase}/v2/checkout/orders`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenJson.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{ custom_id: topup.code, description: `Wallet top-up ${topup.code}`, amount: { currency_code: currency.toUpperCase(), value: amount.toFixed(2) } }],
          application_context: {
            shipping_preference: 'NO_SHIPPING',
            user_action: 'PAY_NOW',
            return_url: `${appUrl}/api/wallet/paypal/capture?code=${topup.code}`,
            cancel_url: `${appUrl}/wallet?topup=cancelled`,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'PayPal error');
      const approveUrl = (json.links || []).find((l: any) => l.rel === 'approve')?.href;
      if (!approveUrl) throw new Error('PayPal did not return an approval link');
      await prisma.topup.update({ where: { id: topup.id }, data: { paymentRef: json.id } });
      redirectUrl = approveUrl;
    }
    return NextResponse.json({ ok: true, redirectUrl });
  } catch (e: any) {
    await prisma.topup.update({ where: { id: topup.id }, data: { status: 'CANCELLED' } }).catch(() => {});
    return jsonError(502, e.message || 'Could not start the payment');
  }
});
