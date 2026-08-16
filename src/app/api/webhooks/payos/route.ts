import { NextRequest, NextResponse } from 'next/server';
import { getPayosConfig, verifyPayosWebhook } from '@/lib/payos';
import { findIntentByRef, settleIntent, warnUnmatched } from '@/lib/payments';

export const dynamic = 'force-dynamic';

const ok = () => NextResponse.json({ success: true });

export async function POST(req: NextRequest) {
  const cfg = await getPayosConfig();

  if (!cfg.checksumKey) {
    console.error('PayOS webhook rejected: payos_checksum_key is not configured');
    return NextResponse.json({ success: false, error: 'Webhook not configured' }, { status: 503 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
  }

  if (!verifyPayosWebhook(body, cfg.checksumKey)) {
    return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
  }

  const data = body.data || {};
  const ref = Number(data.orderCode);
  const intent = await findIntentByRef(ref);

  // PayOS posts a synthetic update with orderCode 123 when the endpoint is
  // registered — that must answer 200, not 404.
  if (!intent) return ok();
  if (intent.method !== 'payos') return ok();
  if (intent.status === 'PAID') return ok();

  // The record must already hold this payment link id, mirroring the existing
  // Stripe guard where the record must already hold the session id.
  const linkId = String(data.paymentLinkId || '');
  if (intent.gatewayRef && linkId && intent.gatewayRef !== linkId) {
    warnUnmatched(`PayOS callback for ${ref} carried link ${linkId}, expected ${intent.gatewayRef}`);
    return ok();
  }

  if (Number(data.amount) < Number(intent.chargeAmount)) {
    warnUnmatched(`PayOS short payment for ${ref}: ${data.amount} < ${intent.chargeAmount}`);
    return ok();
  }

  await settleIntent(intent.id, intent.gatewayRef || linkId || `payos:${ref}`, body);
  return ok();
}
