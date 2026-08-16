import { NextRequest, NextResponse } from 'next/server';
import { getAppUrl } from '@/lib/settings';
import { findIntentByRef, settleIntent } from '@/lib/payments';
import { getPayosLink } from '@/lib/payos';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Where PayOS sends the customer back. This never trusts the query string to
// decide payment: it re-asks PayOS with our own credentials. The webhook is
// still the primary confirmation path.
export async function GET(req: NextRequest) {
  const appUrl = await getAppUrl();
  const ref = Number(req.nextUrl.searchParams.get('ref'));
  const intent = await findIntentByRef(ref);
  if (!intent) return NextResponse.redirect(`${appUrl}/wallet?topup=error`);

  if (intent.status === 'PENDING') {
    const link = await getPayosLink(intent.ref).catch(() => null);
    if (link?.status === 'PAID') await settleIntent(intent.id, intent.gatewayRef || `payos:${intent.ref}`);
  }

  const fresh = await prisma.paymentIntent.findUnique({ where: { id: intent.id } });
  const paid = fresh?.status === 'PAID';

  if (intent.purpose === 'TOPUP') {
    return NextResponse.redirect(`${appUrl}/wallet?topup=${paid ? 'success' : 'pending'}`);
  }
  if (intent.purpose === 'GIFTCARD') {
    return NextResponse.redirect(`${appUrl}/gift-cards?purchase=${paid ? 'success' : 'pending'}`);
  }
  const order = await prisma.order.findUnique({ where: { id: intent.targetId }, select: { code: true } });
  return NextResponse.redirect(
    order ? `${appUrl}/orders/${order.code}?payment=${paid ? 'success' : 'pending'}` : `${appUrl}/orders`
  );
}
