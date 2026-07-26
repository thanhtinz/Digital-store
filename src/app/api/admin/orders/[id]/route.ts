import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { markOrderPaid, sendDeliveryEmail, releaseOrderResources } from '@/lib/orders';
import { creditWallet } from '@/lib/wallet';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// PATCH — admin actions on an order:
//   { action: "deliver", itemId, deliveryData }  → deliver one item manually
//   { action: "markPaid" }                       → confirm an offline payment
//   { action: "cancel" } / { action: "refund" }  → close the order
export const PATCH = handler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireAdmin();
  const id = Number(params.id);
  const b = await req.json();
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) return jsonError(404, 'Order not found');

  if (b.action === 'deliver') {
    const item = order.items.find((i) => i.id === Number(b.itemId));
    if (!item) return jsonError(404, 'Order item not found');
    await prisma.orderItem.update({
      where: { id: item.id },
      data: { deliveryData: String(b.deliveryData || '').slice(0, 10_000), deliveredAt: new Date() },
    });
    const remaining = await prisma.orderItem.count({ where: { orderId: id, deliveredAt: null } });
    if (remaining === 0 && (order.status === 'PAID' || order.status === 'COMPLETED')) {
      await prisma.order.update({ where: { id }, data: { status: 'COMPLETED' } });
    }
    // Automatic email to the buyer with the delivered content.
    sendDeliveryEmail(id).catch(() => {});
  } else if (b.action === 'markPaid') {
    if (order.status !== 'PENDING') return jsonError(400, 'Only pending orders can be marked paid');
    await markOrderPaid(id, 'manual');
  } else if (b.action === 'cancel') {
    if (order.status !== 'PENDING') return jsonError(400, 'Only pending orders can be cancelled');
    await prisma.order.update({ where: { id }, data: { status: 'CANCELLED' } });
    // Free the coupon slot, flash-sale allocation and redeemed points.
    await releaseOrderResources(id);
  } else if (b.action === 'refund') {
    if (order.status !== 'PAID' && order.status !== 'COMPLETED') return jsonError(400, 'Only paid orders can be refunded');
    await prisma.order.update({ where: { id }, data: { status: 'REFUNDED' } });
    // Wallet-paid orders are refunded straight back to the buyer's balance.
    // Stripe/PayPal money must still be refunded in the gateway dashboard.
    if (order.paymentMethod === 'balance') {
      await creditWallet(order.userId, Number(order.total), 'REFUND', `Refund — order ${order.code}`);
    }
    // Give redeemed loyalty points back too.
    if (order.pointsUsed > 0) {
      await prisma.user.update({ where: { id: order.userId }, data: { loyaltyPoints: { increment: order.pointsUsed } } });
    }
  } else {
    return jsonError(400, 'Unknown action');
  }
  audit(admin, `order.${b.action}`, `Order ${order.code}`);

  const fresh = await prisma.order.findUnique({ where: { id }, include: { items: true, user: { select: { name: true, email: true } } } });
  return NextResponse.json({ ok: true, order: fresh });
});
