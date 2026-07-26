import crypto from 'crypto';
import { getSettings, getAppUrl } from './settings';

// Stripe integration via the REST API (no SDK). Card payments: Visa,
// Mastercard, Amex, etc. through Stripe Checkout hosted pages.
const STRIPE_API = 'https://api.stripe.com/v1';

// Currencies where Stripe amounts are NOT in minor units (no cents).
const ZERO_DECIMAL = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf']);

export function toStripeAmount(amount: number, currency: string): number {
  return ZERO_DECIMAL.has(currency.toLowerCase()) ? Math.round(amount) : Math.round(amount * 100);
}

export async function getStripeConfig() {
  const s = await getSettings(['stripe_enabled', 'stripe_secret_key', 'stripe_publishable_key', 'stripe_webhook_secret']);
  return {
    enabled: s.stripe_enabled === 'true' && !!s.stripe_secret_key,
    secretKey: s.stripe_secret_key,
    publishableKey: s.stripe_publishable_key,
    webhookSecret: s.stripe_webhook_secret,
  };
}

function encodeForm(data: Record<string, string>): string {
  return Object.entries(data)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

async function stripeRequest(secretKey: string, path: string, form?: Record<string, string>) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: form ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: form ? encodeForm(form) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Stripe API error (${res.status})`);
  return json;
}

export async function createStripeCheckoutSession(order: {
  code: string;
  total: number;
  currency: string;
  email: string;
  itemsLabel: string;
}): Promise<{ id: string; url: string }> {
  const cfg = await getStripeConfig();
  if (!cfg.enabled) throw new Error('Card payments are not available right now');
  const appUrl = await getAppUrl();

  const session = await stripeRequest(cfg.secretKey, '/checkout/sessions', {
    mode: 'payment',
    customer_email: order.email,
    client_reference_id: order.code,
    'payment_method_types[0]': 'card',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': order.currency.toLowerCase(),
    'line_items[0][price_data][unit_amount]': String(toStripeAmount(order.total, order.currency)),
    'line_items[0][price_data][product_data][name]': order.itemsLabel.slice(0, 120) || `Order ${order.code}`,
    'metadata[order_code]': order.code,
    success_url: `${appUrl}/orders/${order.code}?payment=success`,
    cancel_url: `${appUrl}/orders/${order.code}?payment=cancelled`,
  });
  return { id: session.id, url: session.url };
}

export async function retrieveStripeSession(sessionId: string) {
  const cfg = await getStripeConfig();
  if (!cfg.secretKey) throw new Error('Stripe is not configured');
  return stripeRequest(cfg.secretKey, `/checkout/sessions/${encodeURIComponent(sessionId)}`);
}

// Verify a Stripe webhook signature header against the raw request body.
// https://docs.stripe.com/webhooks#verify-manually
export function verifyStripeSignature(rawBody: string, sigHeader: string, secret: string, toleranceSec = 300): boolean {
  if (!sigHeader || !secret) return false;
  const parts = Object.fromEntries(
    sigHeader.split(',').map((kv) => {
      const idx = kv.indexOf('=');
      return [kv.slice(0, idx), kv.slice(idx + 1)];
    })
  );
  const timestamp = Number(parts.t);
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSec) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function testStripeConnection(secretKey: string): Promise<boolean> {
  try {
    await stripeRequest(secretKey, '/balance');
    return true;
  } catch {
    return false;
  }
}
