import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSepayConfig, verifySepayAuth, extractRef, type SepayPayload } from '@/lib/sepay';
import { findIntentByRef, settleIntent, warnUnmatched } from '@/lib/payments';

export const dynamic = 'force-dynamic';

// SePay treats anything other than 200/201 with {"success": true} as a failure
// and retries, so every handled case answers exactly that — including refs we
// cannot match. Unmatched money is reported to the owner instead.
const ok = () => NextResponse.json({ success: true });

export async function POST(req: NextRequest) {
  const cfg = await getSepayConfig();

  // Fail closed: with no key configured, nobody can mark anything paid.
  if (!cfg.webhookKey) {
    console.error('SePay webhook rejected: sepay_webhook_key is not configured');
    return NextResponse.json({ success: false, error: 'Webhook not configured' }, { status: 503 });
  }
  if (!verifySepayAuth(req.headers.get('authorization'), cfg.webhookKey)) {
    return NextResponse.json({ success: false, error: 'Invalid API key' }, { status: 401 });
  }

  let payload: SepayPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
  }

  // Only money coming in can pay for anything.
  if (String(payload.transferType || '').toLowerCase() !== 'in') return ok();

  const amount = Number(payload.transferAmount);
  if (!Number.isFinite(amount) || amount <= 0) return ok();

  const ref = extractRef(payload, cfg.prefix);
  if (ref === null) {
    warnUnmatched(`No ${cfg.prefix} reference found. ${amount} from "${payload.content || ''}"`);
    return ok();
  }

  const intent = await findIntentByRef(ref);
  if (!intent) {
    warnUnmatched(`Reference ${cfg.prefix}${ref} matches no payment. Amount ${amount}`);
    return ok();
  }
  if (intent.method !== 'sepay') {
    warnUnmatched(`Reference ${cfg.prefix}${ref} is a ${intent.method} payment, not SePay`);
    return ok();
  }
  if (intent.status === 'PAID') return ok(); // duplicate delivery

  // Overpayment is fine (bank rounding, a generous typo); underpayment is not.
  if (Math.round(amount) < Number(intent.chargeAmount)) {
    warnUnmatched(
      `Short payment for ${intent.memo}: received ${amount}, expected ${intent.chargeAmount} ${intent.chargeCurrency}`
    );
    return ok();
  }

  // gatewayRef is unique, so the same bank transaction can never settle twice.
  const txnId = payload.id ? `sepay:${payload.id}` : `sepay:ref:${ref}`;
  const existing = await prisma.paymentIntent.findFirst({ where: { gatewayRef: txnId } });
  if (existing) return ok();

  await settleIntent(intent.id, txnId, payload);
  return ok();
}
