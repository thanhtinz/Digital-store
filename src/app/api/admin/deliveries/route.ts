import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Delivery queue: paid orders that still have undelivered items.
export const GET = handler(async () => {
  await requireAdmin();
  const orders = await prisma.order.findMany({
    where: { status: 'PAID', items: { some: { deliveredAt: null } } },
    orderBy: { paidAt: 'asc' }, // oldest paid first — they've waited longest
    take: 100,
    include: {
      user: { select: { name: true, email: true } },
      items: true,
    },
  });
  return NextResponse.json({ orders, count: orders.length });
});
