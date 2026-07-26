import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Security audit data: recent failed sign-ins, currently locked accounts,
// and recent admin sign-ins.
export const GET = handler(async () => {
  await requireAdmin();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const lockWindow = new Date(Date.now() - 15 * 60 * 1000);

  const [failedLogins, adminLogins, lockedRaw] = await Promise.all([
    prisma.loginHistory.findMany({
      where: { success: false, createdAt: { gte: dayAgo } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { email: true, name: true } } },
    }),
    prisma.loginHistory.findMany({
      where: { success: true, user: { role: { in: ['ADMIN', 'STAFF'] } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { email: true, name: true, role: true } } },
    }),
    prisma.loginHistory.groupBy({
      by: ['userId'],
      where: { success: false, createdAt: { gte: lockWindow } },
      _count: true,
    }),
  ]);

  const lockedIds = lockedRaw.filter((g) => g._count >= 5).map((g) => g.userId);
  const lockedUsers = lockedIds.length
    ? await prisma.user.findMany({ where: { id: { in: lockedIds } }, select: { id: true, email: true, name: true } })
    : [];

  const serialize = (r: any) => ({
    id: r.id,
    email: r.user?.email,
    name: r.user?.name,
    role: r.user?.role,
    ip: r.ip,
    userAgent: r.userAgent,
    method: r.method,
    createdAt: r.createdAt.toISOString(),
  });

  return NextResponse.json({
    failedLogins: failedLogins.map(serialize),
    adminLogins: adminLogins.map(serialize),
    lockedUsers,
  });
});
