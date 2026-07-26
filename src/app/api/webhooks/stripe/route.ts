import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getStripeConfig, verifyStripeSignature } from '@/lib/stripe';
import { markOrderPaid } from '@/lib/orders';
import { completeTopup } from '@/lib/wallet';

export const dynamic = 'force-dynamic';

// Stripe webhook — the source of truth for card payment confirmation.
// Configure the endpoint in the Stripe dashboard: <APP_URL>/api/webhooks/stripe
// with the `checkout.session.completed` event.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature') || '';
  const cfg = await getStripeConfig();

  // Fail closed: without a configured webhook secret nobody can mark orders paid.
  if (!cfg.webhookSecret) {
    console.error('Stripe webhook rejected: stripe_webhook_secret is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }
  if (!verifyStripeSignature(rawBody, signature, cfg.webhookSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object || {};
    if (session.payment_status === 'paid') {
      // Wallet top-up sessions carry a topup_code instead of an order code.
      if (session.metadata?.topup_code) {
        const topup = await prisma.topup.findUnique({ where: { code: String(session.metadata.topup_code) } });
        if (topup && topup.paymentRef === session.id) await completeTopup(topup.id);
        return NextResponse.json({ received: true });
      }
      const orderCode = session.metadata?.order_code || session.client_reference_id;
      const order = orderCode
        ? await prisma.order.findUnique({ where: { code: String(orderCode) } })
        : await prisma.order.findFirst({ where: { paymentRef: String(session.id) } });
      if (order && order.paymentRef === session.id) {
        await markOrderPaid(order.id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
