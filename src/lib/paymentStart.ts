import prisma from './db';
import type { PaymentIntent } from '@prisma/client';
import { getAppUrl } from './settings';
import { createPayosLink } from './payos';

// Turns a freshly created intent into the URL the customer should be sent to.
// SePay and manual transfers stay on our own transfer screen; PayOS hands the
// customer over to its hosted checkout.
export async function startIntentPayment(
  intent: PaymentIntent,
  label: string,
  cancelPath: string
): Promise<string> {
  if (intent.method !== 'payos') return `/pay/${intent.id}`;

  const appUrl = await getAppUrl();
  let link: { checkoutUrl: string; paymentLinkId: string };
  try {
    link = await createPayosLink({
      orderCode: intent.ref,
      amount: Number(intent.chargeAmount),
      currency: intent.chargeCurrency,
      description: intent.memo || label,
      returnUrl: `${appUrl}/api/payments/payos/return?ref=${intent.ref}`,
      cancelUrl: `${appUrl}${cancelPath}?payment=cancelled`,
      expiresAt: intent.expiresAt,
    });
  } catch (e: any) {
    // Do not leave the intent dangling as PENDING when its gateway link never
    // existed — the caller's rollback only knows about the order or top-up.
    await prisma.paymentIntent.updateMany({
      where: { id: intent.id, status: 'PENDING' },
      data: { status: 'CANCELLED', reviewNote: String(e?.message || 'Gateway error').slice(0, 300) },
    });
    console.error('[payos] could not create a payment link:', e);
    throw new Error('PayOS is not responding right now. Please try another payment method.');
  }
  // Storing the link id first is what lets the webhook prove the callback
  // belongs to this intent, mirroring the existing paymentRef check.
  await prisma.paymentIntent.update({
    where: { id: intent.id },
    data: { gatewayRef: link.paymentLinkId || `payos:${intent.ref}` },
  });
  return link.checkoutUrl;
}
