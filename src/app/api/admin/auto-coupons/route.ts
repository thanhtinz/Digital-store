import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  await requireAdmin();
  const rules = await prisma.autoCouponRule.findMany({
    orderBy: { id: 'desc' },
    include: { _count: { select: { grants: true } } },
  });
  return NextResponse.json({ rules });
});

function ruleData(b: any) {
  return {
    name: String(b.name || '').trim().slice(0, 120),
    trigger: b.trigger === 'WINBACK' ? 'WINBACK' : 'ABANDONED_CART',
    delayHours: Math.max(1, Number(b.delayHours) || 24),
    inactiveDays: Math.max(1, Number(b.inactiveDays) || 30),
    minCartValue: b.minCartValue ? Number(b.minCartValue) : null,
    minSpentTotal: b.minSpentTotal ? Number(b.minSpentTotal) : null,
    discountType: b.discountType === 'FIXED' ? 'FIXED' : 'PERCENT',
    value: Number(b.value) || 0,
    maxDiscount: b.maxDiscount ? Number(b.maxDiscount) : null,
    expiresDays: Math.max(1, Number(b.expiresDays) || 7),
    cooldownDays: Math.max(1, Number(b.cooldownDays) || 30),
    isActive: b.isActive !== false,
  };
}

export const POST = handler(async (req: NextRequest) => {
  await requireAdmin();
  const data = ruleData(await req.json());
  if (!data.name) return jsonError(400, 'Rule name is required');
  if (data.value <= 0 || (data.discountType === 'PERCENT' && data.value > 100)) {
    return jsonError(400, 'Invalid discount value');
  }
  const rule = await prisma.autoCouponRule.create({ data });
  return NextResponse.json({ ok: true, rule });
});
