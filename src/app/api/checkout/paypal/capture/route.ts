import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { capturePaypalOrder } from '@/lib/paypal';
import { markOrderPaid } from '@/lib/orders';
import { getAppUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';

// PayPal return URL. Captures the approved payment server-side, then sends
// the buyer to their order page.
export async function GET(req: NextRequest) {
  const appUrl = await getAppUrl();
  const orderCode = req.nextUrl.searchParams.get('order_code') || '';
  const paypalOrderId = req.nextUrl.searchParams.get('token') || '';

  const order = await prisma.order.findUnique({ where: { code: orderCode } });
  if (!order || !paypalOrderId || order.paymentRef !== paypalOrderId) {
    return NextResponse.redirect(`${appUrl}/orders?payment=error`);
  }

  try {
    if (order.status === 'PENDING') {
      const captured = await capturePaypalOrder(paypalOrderId);
      if (captured) await markOrderPaid(order.id);
    }
  } catch (e) {
    console.error('PayPal capture error:', e);
  }

  const fresh = await prisma.order.findUnique({ where: { id: order.id } });
  const flag = fresh && fresh.status !== 'PENDING' ? 'success' : 'pending';
  return NextResponse.redirect(`${appUrl}/orders/${order.code}?payment=${flag}`);
}
