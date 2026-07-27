import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { capturePaypalOrder } from '@/lib/paypal';
import { activateGiftCard } from '@/lib/giftcards';
import { getAppUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';

// PayPal return URL for gift card purchases.
export async function GET(req: NextRequest) {
  const appUrl = await getAppUrl();
  const id = Number(req.nextUrl.searchParams.get('id'));
  const paypalOrderId = req.nextUrl.searchParams.get('token') || '';

  const card = Number.isInteger(id) ? await prisma.giftCard.findUnique({ where: { id } }) : null;
  if (!card || !paypalOrderId || card.paymentRef !== paypalOrderId) {
    return NextResponse.redirect(`${appUrl}/gift-cards?purchase=error`);
  }
  try {
    if (card.status === 'PENDING' && (await capturePaypalOrder(paypalOrderId))) {
      await activateGiftCard(card.id);
    }
  } catch (e) {
    console.error('PayPal gift card capture error:', e);
  }
  const fresh = await prisma.giftCard.findUnique({ where: { id: card.id } });
  return NextResponse.redirect(`${appUrl}/gift-cards?purchase=${fresh?.status === 'ACTIVE' ? 'success' : 'pending'}`);
}
