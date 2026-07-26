import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handler } from '@/lib/api';
import { getSettings, getAppUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';

function generateRefCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Affiliate dashboard data — lazily assigns a referral code on first visit.
export const GET = handler(async () => {
  let user = await requireUser();
  const s = await getSettings(['affiliate_enabled', 'affiliate_rate']);

  if (!user.refCode) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        user = await prisma.user.update({ where: { id: user.id }, data: { refCode: generateRefCode() } });
        break;
      } catch {
        // refCode collision — retry with a new one
      }
    }
  }

  const [referredCount, commissionAgg, recent] = await Promise.all([
    prisma.user.count({ where: { referredById: user.id } }),
    prisma.walletTransaction.aggregate({ where: { userId: user.id, type: 'COMMISSION' }, _sum: { amount: true } }),
    prisma.walletTransaction.findMany({
      where: { userId: user.id, type: 'COMMISSION' },
      orderBy: { id: 'desc' },
      take: 20,
    }),
  ]);

  const appUrl = await getAppUrl();
  return NextResponse.json({
    enabled: s.affiliate_enabled === 'true',
    rate: Number(s.affiliate_rate) || 0,
    refCode: user.refCode,
    link: `${appUrl}/?ref=${user.refCode}`,
    referredCount,
    totalCommission: Number(commissionAgg._sum.amount || 0),
    recent: recent.map((t) => ({ id: t.id, amount: Number(t.amount), note: t.note, createdAt: t.createdAt.toISOString() })),
  });
});
