import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler } from '@/lib/api';
import { clampInt } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// Sales analytics for the admin Reports page: revenue series, top products,
// payment method + status breakdowns, new customers.
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin();
  const days = clampInt(req.nextUrl.searchParams.get('days'), 7, 365, 30);
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = new Date(dayStart.getTime() - (days - 1) * 86400_000);
  const paidWhere = { status: { in: ['PAID', 'COMPLETED'] as any[] }, paidAt: { gte: from } };

  const [paidOrders, statusGroups, methodGroups, topItems, newCustomers, couponAgg] = await Promise.all([
    prisma.order.findMany({ where: paidWhere, select: { paidAt: true, total: true } }),
    prisma.order.groupBy({ by: ['status'], where: { createdAt: { gte: from } }, _count: true }),
    prisma.order.groupBy({ by: ['paymentMethod'], where: paidWhere, _sum: { total: true }, _count: true }),
    prisma.orderItem.groupBy({
      by: ['productName'],
      where: { order: paidWhere },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
      take: 10,
    }),
    prisma.user.count({ where: { createdAt: { gte: from } } }),
    prisma.order.aggregate({ where: paidWhere, _sum: { discount: true }, _avg: { total: true } }),
  ]);

  const series: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(from.getTime() + i * 86400_000);
    series.push({ date: d.toISOString().slice(0, 10), revenue: 0, orders: 0 });
  }
  const byDate = new Map(series.map((s) => [s.date, s]));
  for (const o of paidOrders) {
    const bucket = byDate.get(o.paidAt!.toISOString().slice(0, 10));
    if (bucket) {
      bucket.revenue += Number(o.total);
      bucket.orders += 1;
    }
  }

  const revenue = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
  return NextResponse.json({
    days,
    totals: {
      revenue,
      orders: paidOrders.length,
      avgOrder: Number(couponAgg._avg.total || 0),
      discountGiven: Number(couponAgg._sum.discount || 0),
      newCustomers,
    },
    series,
    topProducts: topItems.map((t) => ({
      name: t.productName,
      units: t._sum.quantity || 0,
      revenue: Number(t._sum.lineTotal || 0),
    })),
    byMethod: methodGroups.map((m) => ({
      method: m.paymentMethod || 'unknown',
      orders: m._count,
      revenue: Number(m._sum.total || 0),
    })),
    byStatus: statusGroups.map((s) => ({ status: s.status, count: s._count })),
  });
});
