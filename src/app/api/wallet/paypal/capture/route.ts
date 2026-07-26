import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { capturePaypalOrder } from '@/lib/paypal';
import { completeTopup } from '@/lib/wallet';
import { getAppUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';

// PayPal return URL for wallet top-ups.
export async function GET(req: NextRequest) {
  const appUrl = await getAppUrl();
  const code = req.nextUrl.searchParams.get('code') || '';
  const paypalOrderId = req.nextUrl.searchParams.get('token') || '';

  const topup = await prisma.topup.findUnique({ where: { code } });
  if (!topup || !paypalOrderId || topup.paymentRef !== paypalOrderId) {
    return NextResponse.redirect(`${appUrl}/wallet?topup=error`);
  }
  try {
    if (topup.status === 'PENDING' && (await capturePaypalOrder(paypalOrderId))) {
      await completeTopup(topup.id);
    }
  } catch (e) {
    console.error('PayPal top-up capture error:', e);
  }
  const fresh = await prisma.topup.findUnique({ where: { id: topup.id } });
  return NextResponse.redirect(`${appUrl}/wallet?topup=${fresh?.status === 'PAID' ? 'success' : 'pending'}`);
}
