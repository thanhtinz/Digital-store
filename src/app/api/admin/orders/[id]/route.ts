import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { markOrderPaid } from '@/lib/orders';

export const dynamic = 'force-dynamic';

// PATCH — admin actions on an order:
//   { action: "deliver", itemId, deliveryData }  → deliver one item manually
//   { action: "markPaid" }                       → confirm an offline payment
//   { action: "cancel" } / { action: "refund" }  → close the order
export const PATCH = handler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  await requireAdmin();
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
  } else if (b.action === 'markPaid') {
    if (order.status !== 'PENDING') return jsonError(400, 'Only pending orders can be marked paid');
    await markOrderPaid(id, 'manual');
  } else if (b.action === 'cancel') {
    if (order.status !== 'PENDING') return jsonError(400, 'Only pending orders can be cancelled');
    await prisma.order.update({ where: { id }, data: { status: 'CANCELLED' } });
  } else if (b.action === 'refund') {
    if (order.status !== 'PAID' && order.status !== 'COMPLETED') return jsonError(400, 'Only paid orders can be refunded');
    // Marks the order refunded for bookkeeping — issue the actual refund in
    // your Stripe/PayPal dashboard.
    await prisma.order.update({ where: { id }, data: { status: 'REFUNDED' } });
  } else {
    return jsonError(400, 'Unknown action');
  }

  const fresh = await prisma.order.findUnique({ where: { id }, include: { items: true, user: { select: { name: true, email: true } } } });
  return NextResponse.json({ ok: true, order: fresh });
});
