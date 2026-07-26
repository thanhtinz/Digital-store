import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  await requireAdmin();
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const paidWhere = { status: { in: ['PAID', 'COMPLETED'] as any[] } };

  const [revenueAll, revenueMonth, revenueToday, ordersTotal, ordersPending, usersTotal, productsTotal, recentOrders] =
    await Promise.all([
      prisma.order.aggregate({ where: paidWhere, _sum: { total: true } }),
      prisma.order.aggregate({ where: { ...paidWhere, paidAt: { gte: monthStart } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { ...paidWhere, paidAt: { gte: dayStart } }, _sum: { total: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PAID' } }), // paid, awaiting delivery
      prisma.user.count(),
      prisma.product.count(),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { name: true, email: true } }, items: { select: { productName: true } } },
      }),
    ]);

  // Last 14 days revenue series for the dashboard chart.
  const series: { date: string; revenue: number }[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const from = new Date(dayStart);
    from.setDate(from.getDate() - i);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    series.push({ date: from.toISOString().slice(0, 10), revenue: 0 });
  }
  const paidRecent = await prisma.order.findMany({
    where: { ...paidWhere, paidAt: { gte: new Date(dayStart.getTime() - 13 * 86400_000) } },
    select: { paidAt: true, total: true },
  });
  for (const o of paidRecent) {
    const key = o.paidAt!.toISOString().slice(0, 10);
    const bucket = series.find((s) => s.date === key);
    if (bucket) bucket.revenue += Number(o.total);
  }

  return NextResponse.json({
    revenue: {
      total: Number(revenueAll._sum.total || 0),
      month: Number(revenueMonth._sum.total || 0),
      today: Number(revenueToday._sum.total || 0),
    },
    counts: {
      orders: ordersTotal,
      awaitingDelivery: ordersPending,
      users: usersTotal,
      products: productsTotal,
    },
    series,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      code: o.code,
      total: Number(o.total),
      status: o.status,
      customer: o.user?.name || o.email,
      summary: o.items.map((i) => i.productName).slice(0, 2).join(', '),
      createdAt: o.createdAt.toISOString(),
    })),
  });
});
