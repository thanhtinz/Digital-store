import { getSettings, getAppUrl } from './settings';

// PayPal integration via REST (Orders API v2). Flow: create order →
// buyer approves on paypal.com → we capture on return and verify status.

export async function getPaypalConfig() {
  const s = await getSettings(['paypal_enabled', 'paypal_client_id', 'paypal_client_secret', 'paypal_mode']);
  const live = s.paypal_mode === 'live';
  return {
    enabled: s.paypal_enabled === 'true' && !!s.paypal_client_id && !!s.paypal_client_secret,
    clientId: s.paypal_client_id,
    clientSecret: s.paypal_client_secret,
    mode: live ? 'live' : 'sandbox',
    apiBase: live ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com',
  };
}

async function getAccessToken(cfg: { apiBase: string; clientId: string; clientSecret: string }): Promise<string> {
  const res = await fetch(`${cfg.apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error_description || 'PayPal authentication failed');
  return json.access_token;
}

export async function createPaypalOrder(order: {
  code: string;
  total: number;
  currency: string;
  itemsLabel: string;
}): Promise<{ id: string; approveUrl: string }> {
  const cfg = await getPaypalConfig();
  if (!cfg.enabled) throw new Error('PayPal payments are not available right now');
  const appUrl = await getAppUrl();
  const token = await getAccessToken(cfg);

  const res = await fetch(`${cfg.apiBase}/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: order.code,
          custom_id: order.code,
          description: order.itemsLabel.slice(0, 120) || `Order ${order.code}`,
          amount: { currency_code: order.currency.toUpperCase(), value: order.total.toFixed(2) },
        },
      ],
      application_context: {
        brand_name: 'Digital Store',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: `${appUrl}/api/checkout/paypal/capture?order_code=${order.code}`,
        cancel_url: `${appUrl}/orders/${order.code}?payment=cancelled`,
      },
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || 'Failed to create PayPal order');
  const approveUrl = (json.links || []).find((l: any) => l.rel === 'approve')?.href;
  if (!approveUrl) throw new Error('PayPal did not return an approval link');
  return { id: json.id, approveUrl };
}

// Capture an approved PayPal order. Returns true when payment completed.
export async function capturePaypalOrder(paypalOrderId: string): Promise<boolean> {
  const cfg = await getPaypalConfig();
  if (!cfg.clientId || !cfg.clientSecret) throw new Error('PayPal is not configured');
  const token = await getAccessToken(cfg);

  const res = await fetch(`${cfg.apiBase}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const json = await res.json();
  if (res.ok && json.status === 'COMPLETED') return true;
  // Already captured earlier (e.g. user refreshed the return URL).
  if (json?.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED') return true;
  return false;
}

export async function testPaypalConnection(clientId: string, clientSecret: string, mode: string): Promise<boolean> {
  try {
    const apiBase = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
    await getAccessToken({ apiBase, clientId, clientSecret });
    return true;
  } catch {
    return false;
  }
}
