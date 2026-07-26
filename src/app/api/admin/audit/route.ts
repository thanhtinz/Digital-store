import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler } from '@/lib/api';
import { clampInt } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// Paginated admin action trail, filterable by action prefix or free text.
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin();
  const page = clampInt(req.nextUrl.searchParams.get('page'), 1, 100_000, 1);
  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  const where = q
    ? {
        OR: [
          { action: { contains: q, mode: 'insensitive' as const } },
          { target: { contains: q, mode: 'insensitive' as const } },
          { userEmail: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {};
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * 30, take: 30 }),
    prisma.auditLog.count({ where }),
  ]);
  return NextResponse.json({ logs, total, page, pageSize: 30 });
});
