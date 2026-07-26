import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { retrieveStripeSession } from '@/lib/stripe';
import { markOrderPaid } from '@/lib/orders';

export const dynamic = 'force-dynamic';

// Polled by the order page right after a payment redirect. As a fallback to
// the webhook, it re-checks the Stripe session status directly.
export const GET = handler(async (_req: NextRequest, { params }: { params: { code: string } }) => {
  const user = await requireUser();
  const order = await prisma.order.findFirst({ where: { code: params.code, userId: user.id } });
  if (!order) return jsonError(404, 'Order not found');

  if (order.status === 'PENDING' && order.paymentMethod === 'stripe' && order.paymentRef) {
    try {
      const session = await retrieveStripeSession(order.paymentRef);
      if (session.payment_status === 'paid') await markOrderPaid(order.id);
    } catch {
      // Stripe unreachable — report current status only.
    }
  }

  const fresh = await prisma.order.findUnique({ where: { id: order.id } });
  return NextResponse.json({ code: order.code, status: fresh?.status || order.status });
});
