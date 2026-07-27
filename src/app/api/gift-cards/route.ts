import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { rateLimit } from '@/lib/rateLimit';
import { generateGiftCode, activateGiftCard } from '@/lib/giftcards';
import { debitWallet } from '@/lib/wallet';
import { getStripeConfig, toStripeAmount } from '@/lib/stripe';
import { getPaypalConfig } from '@/lib/paypal';
import { getAppUrl, getSetting } from '@/lib/settings';

export const dynamic = 'force-dynamic';

const MIN = 5;
const MAX = 500;

// GET — gift cards this user bought (codes are only revealed once ACTIVE).
export const GET = handler(async () => {
  const user = await requireUser();
  const cards = await prisma.giftCard.findMany({
    where: { buyerId: user.id },
    orderBy: { id: 'desc' },
    take: 50,
  });
  return NextResponse.json({
    cards: cards.map((c) => ({
      id: c.id,
      code: c.status === 'PENDING' ? null : c.code,
      amount: Number(c.amount),
      status: c.status,
      createdAt: c.createdAt.toISOString(),
    })),
  });
});

// POST { amount, method: balance|stripe|paypal } — buy a gift card.
export const POST = handler(async (req: NextRequest) => {
  const user = await requireUser();
  rateLimit('giftcard-buy', 10, 60 * 60, String(user.id));
  const b = await req.json();
  const amount = Math.round(Number(b.amount) * 100) / 100;
  const method = ['balance', 'paypal', 'stripe'].includes(b.method) ? b.method : 'stripe';
  if (!Number.isFinite(amount) || amount < MIN || amount > MAX) {
    return jsonError(400, `Gift card amount must be between $${MIN} and $${MAX}`);
  }

  const card = await prisma.giftCard.create({
    data: { code: generateGiftCode(), amount, buyerId: user.id, method },
  });

  // ── Wallet balance: settle instantly ──
  if (method === 'balance') {
    const ok = await debitWallet(user.id, amount, 'PURCHASE', `Gift card ${card.code}`);
    if (!ok) {
      await prisma.giftCard.delete({ where: { id: card.id } }).catch(() => {});
      return jsonError(402, 'Insufficient wallet balance');
    }
    await activateGiftCard(card.id);
    return NextResponse.json({ ok: true, paid: true });
  }

  const currency = (await getSetting('currency')) || 'USD';
  const appUrl = await getAppUrl();
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
          'line_items[0][price_data][product_data][name]': `Gift card $${amount.toFixed(2)}`,
          'metadata[gift_card_id]': String(card.id),
          success_url: `${appUrl}/gift-cards?purchase=success`,
          cancel_url: `${appUrl}/gift-cards?purchase=cancelled`,
        }).toString(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Stripe error');
      await prisma.giftCard.update({ where: { id: card.id }, data: { paymentRef: json.id } });
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
          purchase_units: [{ custom_id: String(card.id), description: `Gift card $${amount.toFixed(2)}`, amount: { currency_code: currency.toUpperCase(), value: amount.toFixed(2) } }],
          application_context: {
            shipping_preference: 'NO_SHIPPING',
            user_action: 'PAY_NOW',
            return_url: `${appUrl}/api/gift-cards/paypal/capture?id=${card.id}`,
            cancel_url: `${appUrl}/gift-cards?purchase=cancelled`,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'PayPal error');
      const approveUrl = (json.links || []).find((l: any) => l.rel === 'approve')?.href;
      if (!approveUrl) throw new Error('PayPal did not return an approval link');
      await prisma.giftCard.update({ where: { id: card.id }, data: { paymentRef: json.id } });
      redirectUrl = approveUrl;
    }
    return NextResponse.json({ ok: true, redirectUrl });
  } catch (e: any) {
    await prisma.giftCard.delete({ where: { id: card.id } }).catch(() => {});
    return jsonError(502, e.message || 'Could not start the payment');
  }
});
