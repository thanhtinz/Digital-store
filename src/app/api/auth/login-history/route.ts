import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handler } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const user = await requireUser();
  const rows = await prisma.loginHistory.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  return NextResponse.json({
    logins: rows.map((r) => ({
      id: r.id,
      ip: r.ip,
      userAgent: r.userAgent,
      method: r.method,
      success: r.success,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});
