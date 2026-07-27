import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireApiKey, ApiAuthError } from '@/lib/apiAuth';
import { RateLimitError } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// GET /api/v1/orders/:code — one order with delivery data.
export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const { user } = await requireApiKey(req);
    const order = await prisma.order.findFirst({
      where: { code: params.code.toUpperCase(), userId: user.id },
      include: { items: true },
    });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    return NextResponse.json({
      order: {
        code: order.code,
        status: order.status,
        total: Number(order.total),
        created_at: order.createdAt,
        items: order.items.map((i) => ({
          package_id: i.packageId,
          product: i.productName,
          package: i.packageName,
          quantity: i.quantity,
          unit_price: Number(i.unitPrice),
          delivered: !!i.deliveredAt,
          delivery_data: i.deliveryData || null,
        })),
      },
    });
  } catch (e: any) {
    if (e instanceof ApiAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof RateLimitError) return NextResponse.json({ error: e.message }, { status: 429 });
    console.error('API v1 error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
