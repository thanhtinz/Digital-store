import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { createOrder, releaseOrderResources, type CheckoutItemInput } from '@/lib/orders';
import { createStripeCheckoutSession } from '@/lib/stripe';
import { createPaypalOrder } from '@/lib/paypal';
import { debitWallet } from '@/lib/wallet';
import { markOrderPaid } from '@/lib/orders';

export const dynamic = 'force-dynamic';

// Creates a PENDING order from the user's server-side cart (or an explicit
// "buy now" item) and returns the payment redirect URL for the chosen
// gateway: Stripe Checkout (Visa/Mastercard/…) or PayPal.
export const POST = handler(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await req.json();
  const paymentMethod = body.paymentMethod === 'paypal' ? 'paypal' : body.paymentMethod === 'balance' ? 'balance' : 'stripe';

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
    redeemPoints: body.redeemPoints ? Number(body.redeemPoints) : undefined,
    paymentMethod,
  });

  const itemsLabel = order.items.map((i) => `${i.productName} — ${i.packageName} ×${i.quantity}`).join(', ');

  // ── Pay with wallet balance: settle instantly, no gateway redirect ──
  if (paymentMethod === 'balance') {
    const ok = await debitWallet(user.id, Number(order.total), 'PURCHASE', `Order ${order.code}`);
    if (!ok) {
      await cancelOrder(order.id);
      return jsonError(402, 'Insufficient wallet balance — top up or choose another method');
    }
    if (fromCart) await prisma.cartItem.deleteMany({ where: { userId: user.id } });
    await markOrderPaid(order.id, 'wallet');
    return NextResponse.json({ ok: true, orderCode: order.code, paid: true, redirectUrl: `/orders/${order.code}?payment=success` });
  }

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
    await cancelOrder(order.id);
    return jsonError(502, e.message || 'Could not start the payment. Please try again.');
  }
});

// Cancels a just-created order and releases everything it was holding
// (coupon slot, flash-sale allocation, redeemed loyalty points).
async function cancelOrder(orderId: number): Promise<void> {
  await prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } }).catch(() => {});
  await releaseOrderResources(orderId).catch(() => {});
}
