import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler } from '@/lib/api';
import { clampInt } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req: NextRequest) => {
  await requireAdmin();
  const sp = req.nextUrl.searchParams;
  const q = sp.get('q')?.trim() || '';
  const status = sp.get('status') || '';
  const page = clampInt(sp.get('page'), 1, 100_000, 1);

  const where: any = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { code: { contains: q.toUpperCase() } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { id: 'desc' },
      skip: (page - 1) * 20,
      take: 20,
      include: {
        user: { select: { name: true, email: true } },
        items: true,
      },
    }),
    prisma.order.count({ where }),
  ]);
  return NextResponse.json({ orders, total, page, pageSize: 20 });
});
