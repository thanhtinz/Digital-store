import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler } from '@/lib/api';
import { audit } from '@/lib/audit';
import { clampInt } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function csvCell(v: unknown): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET ?days=30 — download the order book as a CSV file (spreadsheet-ready).
export const GET = handler(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const days = clampInt(req.nextUrl.searchParams.get('days'), 1, 365, 30);
  const from = new Date(Date.now() - days * 86400_000);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: from } },
    orderBy: { createdAt: 'desc' },
    take: 10_000,
    include: {
      user: { select: { email: true, name: true } },
      items: { select: { productName: true, packageName: true, quantity: true } },
    },
  });

  const header = [
    'Order code', 'Created (UTC)', 'Paid (UTC)', 'Status', 'Customer', 'Email',
    'Items', 'Subtotal', 'Discount', 'Points used', 'Total', 'Payment method', 'Coupon',
  ];
  const rows = orders.map((o) => [
    o.code,
    o.createdAt.toISOString(),
    o.paidAt ? o.paidAt.toISOString() : '',
    o.status,
    o.user?.name || '',
    o.user?.email || o.email,
    o.items.map((i) => `${i.productName} - ${i.packageName} x${i.quantity}`).join('; '),
    Number(o.subtotal).toFixed(2),
    Number(o.discount).toFixed(2),
    o.pointsUsed,
    Number(o.total).toFixed(2),
    o.paymentMethod || '',
    o.couponCode || '',
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');

  audit(admin, 'report.export', `Orders CSV (${days}d)`, `${orders.length} row(s)`);
  // UTF-8 BOM so Excel opens the file with correct encoding.
  return new Response('\uFEFF' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="orders-last-${days}-days.csv"`,
    },
  });
});
