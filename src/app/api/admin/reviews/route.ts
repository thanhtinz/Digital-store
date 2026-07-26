import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler } from '@/lib/api';
import { clampInt } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req: NextRequest) => {
  await requireAdmin();
  const page = clampInt(req.nextUrl.searchParams.get('page'), 1, 100_000, 1);
  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      orderBy: { id: 'desc' },
      skip: (page - 1) * 20,
      take: 20,
      include: {
        user: { select: { name: true, email: true } },
        product: { select: { name: true, slug: true } },
      },
    }),
    prisma.review.count(),
  ]);
  return NextResponse.json({ reviews, total, page, pageSize: 20 });
});
