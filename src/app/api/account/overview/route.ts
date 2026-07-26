import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handler } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Account overview numbers for the profile header.
export const GET = handler(async () => {
  const user = await requireUser();
  const [orderCount, spentAgg, wishlistCount, ticketCount] = await Promise.all([
    prisma.order.count({ where: { userId: user.id, status: { in: ['PAID', 'COMPLETED'] } } }),
    prisma.order.aggregate({ where: { userId: user.id, status: { in: ['PAID', 'COMPLETED'] } }, _sum: { total: true } }),
    prisma.wishlistItem.count({ where: { userId: user.id } }),
    prisma.supportTicket.count({ where: { userId: user.id } }),
  ]);
  return NextResponse.json({
    orders: orderCount,
    totalSpent: Number(spentAgg._sum.total || 0),
    wishlist: wishlistCount,
    tickets: ticketCount,
    memberSince: user.createdAt.toISOString(),
  });
});
