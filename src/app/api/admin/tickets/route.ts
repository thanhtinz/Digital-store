import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler } from '@/lib/api';
import { clampInt } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req: NextRequest) => {
  await requireAdmin();
  const status = req.nextUrl.searchParams.get('status') || '';
  const page = clampInt(req.nextUrl.searchParams.get('page'), 1, 100_000, 1);
  const where = status ? { status: status as any } : {};
  const [tickets, total, openCount] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      skip: (page - 1) * 20,
      take: 20,
      include: {
        user: { select: { name: true, email: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    }),
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.count({ where: { status: 'OPEN' } }),
  ]);
  return NextResponse.json({ tickets, total, openCount, page, pageSize: 20 });
});
