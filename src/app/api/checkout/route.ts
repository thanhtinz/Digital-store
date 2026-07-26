import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { createOrder, type CheckoutItemInput } from '@/lib/orders';
import { createStripeCheckoutSession } from '@/lib/stripe';
import { createPaypalOrder } from '@/lib/paypal';

export const dynamic = 'force-dynamic';

// Creates a PENDING order from the user's server-side cart (or an explicit
// "buy now" item) and returns the payment redirect URL for the chosen
// gateway: Stripe Checkout (Visa/Mastercard/…) or PayPal.
export const POST = handler(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await req.json();
  const paymentMethod = body.paymentMethod === 'paypal' ? 'paypal' : 'stripe';

  let items: CheckoutItemInput[];
  let fromCart = false;
  if (body.buyNow && body.buyNow.packageId) {
    items = [{
      packageId: Number(body.buyNow.packageId),
      quantity: Number(body.buyNow.quantity) || 1,
      customFieldsData: body.buyNow.customFieldsData || undefined,
    }];
  } else {
    fromCart = true;
    const cartItems = await prisma.cartItem.findMany({ where: { userId: user.id } });
    items = cartItems.map((c) => ({
      packageId: c.packageId,
      quantity: c.quantity,
      customFieldsData: (c.customFieldsData as Record<string, string>) || undefined,
    }));
  }
  if (!items.length) return jsonError(400, 'Your cart is empty');

  const order = await createOrder({
    userId: user.id,
    email: user.email,
    items,
    couponCode: body.couponCode ? String(body.couponCode) : undefined,
    paymentMethod,
  });

  const itemsLabel = order.items.map((i) => `${i.productName} — ${i.packageName} ×${i.quantity}`).join(', ');

  try {
    let redirectUrl: string;
    if (paymentMethod === 'paypal') {
      const pp = await createPaypalOrder({
        code: order.code,
        total: Number(order.total),
        currency: order.currency,
        itemsLabel,
      });
      await prisma.order.update({ where: { id: order.id }, data: { paymentRef: pp.id } });
      redirectUrl = pp.approveUrl;
    } else {
      const session = await createStripeCheckoutSession({
        code: order.code,
        total: Number(order.total),
        currency: order.currency,
        email: order.email,
        itemsLabel,
      });
      await prisma.order.update({ where: { id: order.id }, data: { paymentRef: session.id } });
      redirectUrl = session.url;
    }
    if (fromCart) await prisma.cartItem.deleteMany({ where: { userId: user.id } });
    return NextResponse.json({ ok: true, orderCode: order.code, redirectUrl });
  } catch (e: any) {
    // Payment session failed — cancel the order so coupons/flash stock free up.
    await prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } }).catch(() => {});
    return jsonError(502, e.message || 'Could not start the payment. Please try again.');
  }
});
