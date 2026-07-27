import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireApiKey, ApiAuthError } from '@/lib/apiAuth';
import { createOrder, markOrderPaid, releaseOrderResources, OrderError } from '@/lib/orders';
import { debitWallet } from '@/lib/wallet';
import { RateLimitError } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

function serializeOrder(order: any) {
  return {
    code: order.code,
    status: order.status,
    total: Number(order.total),
    created_at: order.createdAt,
    items: order.items.map((i: any) => ({
      package_id: i.packageId,
      product: i.productName,
      package: i.packageName,
      quantity: i.quantity,
      unit_price: Number(i.unitPrice),
      delivered: !!i.deliveredAt,
      delivery_data: i.deliveryData || null,
    })),
  };
}

// POST /api/v1/orders { package_id, quantity, custom_fields } — place an
// order paid from the key owner's wallet balance. Instant-delivery
// packages return the codes in the same response.
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireApiKey(req);
    const b = await req.json().catch(() => ({}));
    const packageId = Number(b.package_id);
    const quantity = Math.max(1, Math.floor(Number(b.quantity) || 1));
    if (!packageId) return NextResponse.json({ error: 'package_id is required' }, { status: 400 });

    const order = await createOrder({
      userId: user.id,
      email: user.email,
      items: [{ packageId, quantity, customFieldsData: b.custom_fields || undefined }],
      paymentMethod: 'balance',
    });

    const ok = await debitWallet(user.id, Number(order.total), 'PURCHASE', `Order ${order.code}`);
    if (!ok) {
      await prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } }).catch(() => {});
      await releaseOrderResources(order.id).catch(() => {});
      return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 402 });
    }
    await markOrderPaid(order.id, 'api');

    const fresh = await prisma.order.findUnique({ where: { id: order.id }, include: { items: true } });
    return NextResponse.json({ order: serializeOrder(fresh) }, { status: 201 });
  } catch (e: any) {
    if (e instanceof ApiAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof RateLimitError) return NextResponse.json({ error: e.message }, { status: 429 });
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error('API v1 error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// GET /api/v1/orders — the key owner's recent orders.
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireApiKey(req);
    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { id: 'desc' },
      take: 50,
      include: { items: true },
    });
    return NextResponse.json({ orders: orders.map(serializeOrder) });
  } catch (e: any) {
    if (e instanceof ApiAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof RateLimitError) return NextResponse.json({ error: e.message }, { status: 429 });
    console.error('API v1 error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
