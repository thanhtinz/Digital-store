import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler } from '@/lib/api';
import { clampInt } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req: NextRequest) => {
  await requireAdmin();
  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  const page = clampInt(req.nextUrl.searchParams.get('page'), 1, 100_000, 1);
  const where = q
    ? { OR: [{ email: { contains: q, mode: 'insensitive' as const } }, { name: { contains: q, mode: 'insensitive' as const } }] }
    : {};
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { id: 'desc' },
      skip: (page - 1) * 20,
      take: 20,
      select: {
        id: true, email: true, name: true, role: true, isBlocked: true,
        emailVerifiedAt: true, twoFactorEnabled: true, googleId: true, createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  return NextResponse.json({ users, total, page, pageSize: 20 });
});
