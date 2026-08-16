import crypto from 'crypto';
import { getSettings } from './settings';
import { minorUnits } from './currency';

// PayOS hosted payment links. REST directly, matching how Stripe and PayPal
// are integrated here — no SDK.
export async function getPayosConfig() {
  const s = await getSettings(['payos_enabled', 'payos_client_id', 'payos_api_key', 'payos_checksum_key', 'payos_api_base']);
  return {
    enabled: s.payos_enabled === 'true' && !!s.payos_client_id && !!s.payos_api_key && !!s.payos_checksum_key,
    clientId: s.payos_client_id,
    apiKey: s.payos_api_key,
    checksumKey: s.payos_checksum_key,
    apiBase: (s.payos_api_base || 'https://api-merchant.payos.vn').replace(/\/$/, ''),
  };
}

function hmac(data: string, key: string): string {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

// Payment-request signature: exactly these five fields, alphabetically.
export function signPayosCreate(
  fields: { amount: number; cancelUrl: string; description: string; orderCode: number; returnUrl: string },
  checksumKey: string
): string {
  const data =
    `amount=${fields.amount}&cancelUrl=${fields.cancelUrl}&description=${fields.description}` +
    `&orderCode=${fields.orderCode}&returnUrl=${fields.returnUrl}`;
  return hmac(data, checksumKey);
}

// Webhook signature: every key of `data`, sorted, joined as k=v&k=v.
export function payosDataString(data: Record<string, unknown>): string {
  return Object.keys(data)
    .sort()
    .map((k) => {
      const v = data[k];
      const value = v === null || v === undefined ? '' : Array.isArray(v) || typeof v === 'object' ? JSON.stringify(v) : String(v);
      return `${k}=${value}`;
    })
    .join('&');
}

export function verifyPayosWebhook(body: any, checksumKey: string): boolean {
  if (!body || typeof body !== 'object' || !body.data || typeof body.signature !== 'string') return false;
  const expected = hmac(payosDataString(body.data), checksumKey);
  const a = Buffer.from(expected);
  const b = Buffer.from(body.signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function createPayosLink(params: {
  orderCode: number;
  amount: number;
  currency: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  expiresAt?: Date | null;
}): Promise<{ checkoutUrl: string; paymentLinkId: string }> {
  const cfg = await getPayosConfig();
  if (!cfg.enabled) throw new Error('PayOS is not configured');

  // PayOS truncates long descriptions; keep it short and reference-first.
  const description = params.description.slice(0, 25);
  const amount = minorUnits(params.amount, params.currency);
  const signature = signPayosCreate(
    { amount, cancelUrl: params.cancelUrl, description, orderCode: params.orderCode, returnUrl: params.returnUrl },
    cfg.checksumKey
  );

  const res = await fetch(`${cfg.apiBase}/v2/payment-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-client-id': cfg.clientId, 'x-api-key': cfg.apiKey },
    body: JSON.stringify({
      orderCode: params.orderCode,
      amount,
      description,
      returnUrl: params.returnUrl,
      cancelUrl: params.cancelUrl,
      signature,
      ...(params.expiresAt ? { expiredAt: Math.floor(params.expiresAt.getTime() / 1000) } : {}),
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data?.checkoutUrl) {
    throw new Error(json?.desc || 'PayOS did not return a checkout link');
  }
  return { checkoutUrl: json.data.checkoutUrl, paymentLinkId: String(json.data.paymentLinkId || '') };
}

// Server-side re-check, used as a fallback when a webhook is late or lost.
export async function getPayosLink(orderCode: number): Promise<{ status: string } | null> {
  const cfg = await getPayosConfig();
  if (!cfg.enabled) return null;
  const res = await fetch(`${cfg.apiBase}/v2/payment-requests/${orderCode}`, {
    headers: { 'x-client-id': cfg.clientId, 'x-api-key': cfg.apiKey },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data) return null;
  return { status: String(json.data.status || '') };
}
