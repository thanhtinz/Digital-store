import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const PATCH = handler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const b = await req.json();
  const rule = await prisma.autoCouponRule.update({
    where: { id: Number(params.id) },
    data: {
      ...(b.name !== undefined ? { name: String(b.name).trim().slice(0, 120) } : {}),
      ...(b.trigger !== undefined ? { trigger: b.trigger === 'WINBACK' ? 'WINBACK' : 'ABANDONED_CART' } : {}),
      ...(b.delayHours !== undefined ? { delayHours: Math.max(1, Number(b.delayHours) || 24) } : {}),
      ...(b.inactiveDays !== undefined ? { inactiveDays: Math.max(1, Number(b.inactiveDays) || 30) } : {}),
      ...(b.minCartValue !== undefined ? { minCartValue: b.minCartValue ? Number(b.minCartValue) : null } : {}),
      ...(b.minSpentTotal !== undefined ? { minSpentTotal: b.minSpentTotal ? Number(b.minSpentTotal) : null } : {}),
      ...(b.discountType !== undefined ? { discountType: b.discountType === 'FIXED' ? 'FIXED' : 'PERCENT' } : {}),
      ...(b.value !== undefined ? { value: Number(b.value) || 0 } : {}),
      ...(b.maxDiscount !== undefined ? { maxDiscount: b.maxDiscount ? Number(b.maxDiscount) : null } : {}),
      ...(b.expiresDays !== undefined ? { expiresDays: Math.max(1, Number(b.expiresDays) || 7) } : {}),
      ...(b.cooldownDays !== undefined ? { cooldownDays: Math.max(1, Number(b.cooldownDays) || 30) } : {}),
      ...(b.isActive !== undefined ? { isActive: !!b.isActive } : {}),
    },
  });
  return NextResponse.json({ ok: true, rule });
});

export const DELETE = handler(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await requireAdmin();
  await prisma.autoCouponRule.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ ok: true });
});
